
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use US regional endpoint
const NYLAS_API_BASE = 'https://api.us.nylas.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    const { action, startDate, endDate, calendarIds } = await req.json()

    if (action !== 'fetch_events') {
      throw new Error('Invalid action')
    }

    console.log('[nylas-events] Fetching events for user:', user.id, {
      startDate,
      endDate,
      calendarIds
    })

    // Get user's active connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('nylas_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (connectionsError) {
      console.error('[nylas-events] Error fetching connections:', connectionsError)
      throw new Error('Failed to fetch connections')
    }

    console.log('[nylas-events] Found connections:', connections?.length || 0)

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ events: [], connections: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const allEvents = []
    const connectionInfo = []
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY')

    // Fetch events from each connection
    for (const connection of connections) {
      try {
        console.log('[nylas-events] Processing connection:', {
          id: connection.id,
          grant_id: connection.grant_id,
          email: connection.email,
          provider: connection.provider
        })

        if (!connection.grant_id) {
          console.warn('[nylas-events] Connection missing grant_id, skipping:', connection.id)
          continue
        }

        // Check if token needs refresh
        const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null
        const now = new Date()
        
        let accessToken = connection.access_token

        // Handle token refresh if needed
        if (tokenExpiresAt && tokenExpiresAt <= now && connection.refresh_token) {
          console.log('[nylas-events] Refreshing expired token for connection:', connection.id)
          
          const refreshResponse = await fetch(`${NYLAS_API_BASE}/v3/connect/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              grant_type: 'refresh_token',
              refresh_token: connection.refresh_token,
              client_id: Deno.env.get('NYLAS_CLIENT_ID'),
              client_secret: Deno.env.get('NYLAS_CLIENT_SECRET'),
            }),
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            accessToken = refreshData.access_token

            // Update stored token
            await supabaseClient
              .from('nylas_connections')
              .update({
                access_token: refreshData.access_token,
                token_expires_at: refreshData.expires_at ? new Date(refreshData.expires_at * 1000).toISOString() : null,
              })
              .eq('id', connection.id)

            console.log('[nylas-events] Token refreshed successfully for connection:', connection.id)
          } else {
            console.error('[nylas-events] Token refresh failed for connection:', connection.id)
            continue
          }
        }

        // CRITICAL FIX: Use grant_id instead of connection id for Nylas API calls
        const eventsUrl = new URL(`${NYLAS_API_BASE}/v3/grants/${connection.grant_id}/events`)
        
        // Format dates as Unix timestamps for Nylas API
        if (startDate) {
          const startUnix = Math.floor(new Date(startDate).getTime() / 1000)
          eventsUrl.searchParams.set('start', startUnix.toString())
        }
        if (endDate) {
          const endUnix = Math.floor(new Date(endDate).getTime() / 1000)
          eventsUrl.searchParams.set('end', endUnix.toString())
        }
        if (calendarIds && calendarIds.length > 0) {
          eventsUrl.searchParams.set('calendar_id', calendarIds.join(','))
        }

        console.log('[nylas-events] Fetching events from URL:', eventsUrl.toString())

        const eventsResponse = await fetch(eventsUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${nylasApiKey}`,
            'Accept': 'application/json',
          },
        })

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          console.log('[nylas-events] Events fetched successfully:', {
            connection_id: connection.id,
            grant_id: connection.grant_id,
            events_count: eventsData.data?.length || 0
          })
          
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
          console.error('[nylas-events] Events fetch failed for connection:', connection.id, errorText)
        }

        connectionInfo.push({
          id: connection.id,
          grant_id: connection.grant_id,
          email: connection.email,
          provider: connection.provider,
          is_active: true,
        })

      } catch (error) {
        console.error(`[nylas-events] Error fetching events for connection ${connection.id}:`, error)
        // Continue with other connections
      }
    }

    console.log('[nylas-events] Final result:', {
      total_events: allEvents.length,
      total_connections: connectionInfo.length
    })

    return new Response(
      JSON.stringify({ 
        events: allEvents,
        connections: connectionInfo 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[nylas-events] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
