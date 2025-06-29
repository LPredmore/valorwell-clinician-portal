
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

    // Get user's active connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('nylas_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (connectionsError) {
      throw new Error('Failed to fetch connections')
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ events: [], connections: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const allEvents = []
    const connectionInfo = []

    // Fetch events from each connection
    for (const connection of connections) {
      try {
        // Check if token needs refresh
        const tokenExpiresAt = new Date(connection.token_expires_at)
        const now = new Date()
        
        let accessToken = connection.access_token

        if (tokenExpiresAt <= now && connection.refresh_token) {
          // Refresh token using US regional endpoint
          const refreshResponse = await fetch(`${NYLAS_API_BASE}/v3/connect/token`, {
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

            // Update stored token
            await supabaseClient
              .from('nylas_connections')
              .update({
                access_token: refreshData.access_token,
                token_expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
              })
              .eq('id', connection.id)
          }
        }

        // Build events query using US regional endpoint
        const eventsUrl = new URL(`${NYLAS_API_BASE}/v3/grants/${connection.id}/events`)
        if (startDate) eventsUrl.searchParams.set('start', new Date(startDate).getTime().toString())
        if (endDate) eventsUrl.searchParams.set('end', new Date(endDate).getTime().toString())
        if (calendarIds && calendarIds.length > 0) {
          eventsUrl.searchParams.set('calendar_id', calendarIds.join(','))
        }

        const eventsResponse = await fetch(eventsUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        })

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          
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
        }

        connectionInfo.push({
          id: connection.id,
          email: connection.email,
          provider: connection.provider,
          is_active: true,
        })

      } catch (error) {
        console.error(`Error fetching events for connection ${connection.id}:`, error)
        // Continue with other connections
      }
    }

    return new Response(
      JSON.stringify({ 
        events: allEvents,
        connections: connectionInfo 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Nylas events error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
