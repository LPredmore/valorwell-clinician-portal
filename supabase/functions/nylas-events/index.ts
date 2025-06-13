import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[nylas-events] Request received:', req.method, req.url)
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[nylas-events] No authorization header')
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          code: 'AUTH_HEADER_MISSING',
          details: 'No authorization header provided'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('[nylas-events] Authentication failed:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          code: 'INVALID_JWT',
          details: authError?.message || 'Invalid or expired JWT token'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[nylas-events] Authenticated user:', user.id)

    const { action, startDate, endDate, calendarIds } = await req.json()

    // Check for ping action
    if (action === 'ping') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          user_id: user.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action !== 'fetch_events') {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid action',
          code: 'INVALID_ACTION',
          details: `Action '${action}' is not supported. Use 'fetch_events' or 'ping'.`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's active connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('nylas_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (connectionsError) {
      console.error('[nylas-events] Database error:', connectionsError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch connections',
          code: 'DB_ERROR',
          details: connectionsError.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ events: [], connections: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const allEvents = []
    const connectionInfo = []
    const errors = []

    // Fetch events from each connection
    for (const connection of connections) {
      try {
        // Check if token needs refresh
        const tokenExpiresAt = new Date(connection.token_expires_at)
        const now = new Date()
        
        let accessToken = connection.access_token

        if (tokenExpiresAt <= now && connection.refresh_token) {
          // Refresh token
          console.log(`[nylas-events] Refreshing token for connection ${connection.id}`)
          const refreshResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: Deno.env.get('NYLAS_CLIENT_ID'),
              client_secret: Deno.env.get('NYLAS_CLIENT_SECRET'),
              refresh_token: connection.refresh_token,
              grant_type: 'refresh_token',
            }),
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            accessToken = refreshData.access_token
            console.log(`[nylas-events] Token refreshed successfully for connection ${connection.id}`)

            // Update stored token
            const { error: updateError } = await supabaseClient
              .from('nylas_connections')
              .update({
                access_token: refreshData.access_token,
                token_expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
              })
              .eq('id', connection.id)
              
            if (updateError) {
              console.error(`[nylas-events] Error updating token for connection ${connection.id}:`, updateError)
            }
          } else {
            const errorText = await refreshResponse.text()
            console.error(`[nylas-events] Token refresh failed for connection ${connection.id}:`, refreshResponse.status, errorText)
            errors.push({
              connection_id: connection.id,
              error: 'Token refresh failed',
              details: errorText
            })
            continue
          }
        }

        // Build events query
        const eventsUrl = new URL(`https://api.us.nylas.com/v3/grants/${connection.id}/events`)
        if (startDate) eventsUrl.searchParams.set('start', new Date(startDate).getTime().toString())
        if (endDate) eventsUrl.searchParams.set('end', new Date(endDate).getTime().toString())
        if (calendarIds && calendarIds.length > 0) {
          eventsUrl.searchParams.set('calendar_id', calendarIds.join(','))
        }

        console.log(`[nylas-events] Fetching events for connection ${connection.id}:`, eventsUrl.toString())
        
        const eventsResponse = await fetch(eventsUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        })

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          console.log(`[nylas-events] Received ${eventsData.data?.length || 0} events for connection ${connection.id}`)
          
          // Transform events to consistent format
          const transformedEvents = eventsData.data?.map((event: any) => ({
            id: event.id,
            title: event.title || 'Untitled Event',
            description: event.description,
            when: {
              start_time: event.when?.start_time,
              end_time: event.when?.end_time,
              start_timezone: event.when?.start_timezone,
              end_timezone: event.when?.end_timezone,
            },
            connection_id: connection.id,
            connection_email: connection.email,
            connection_provider: connection.provider,
            calendar_id: event.calendar_id,
            calendar_name: event.calendar_name,
            status: event.status,
            location: event.location,
          })) || []

          allEvents.push(...transformedEvents)
        } else {
          const errorText = await eventsResponse.text()
          console.error(`[nylas-events] Error fetching events for connection ${connection.id}:`, eventsResponse.status, errorText)
          errors.push({
            connection_id: connection.id,
            error: 'Failed to fetch events',
            details: errorText
          })
        }

        connectionInfo.push({
          id: connection.id,
          email: connection.email,
          provider: connection.provider,
          is_active: true,
        })

      } catch (error) {
        console.error(`[nylas-events] Error processing connection ${connection.id}:`, error)
        errors.push({
          connection_id: connection.id,
          error: 'Connection processing error',
          details: error.message
        })
        // Continue with other connections
      }
    }

    const response = {
      events: allEvents,
      connections: connectionInfo
    }
    
    // Only include errors if there are any
    if (errors.length > 0) {
      response.errors = errors
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[nylas-events] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Server error',
        code: 'SERVER_ERROR',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
