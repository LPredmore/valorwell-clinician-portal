
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

    const { action, startDate, endDate } = await req.json()

    const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
    if (!nylasApiKey) {
      throw new Error('Nylas configuration missing - NYLAS_API_KEY not found')
    }

    console.log('[nylas-events] Processing request:', {
      action,
      userId: user.id,
      startDate,
      endDate
    })

    switch (action) {
      case 'fetch_events': {
        // Get user's active Nylas connections
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (connectionsError) {
          console.error('[nylas-events] Error fetching connections:', connectionsError)
          throw new Error('Failed to fetch calendar connections')
        }

        if (!connections || connections.length === 0) {
          console.log('[nylas-events] No active connections found for user:', user.id)
          return new Response(
            JSON.stringify({ 
              events: [], 
              connections: [],
              message: 'No active calendar connections found'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[nylas-events] Found ${connections.length} active connections`)

        const allEvents = []

        for (const connection of connections) {
          try {
            console.log(`[nylas-events] Fetching events for connection: ${connection.id}`)
            
            // Use grant_id for API calls
            const grantId = connection.grant_id || connection.id
            const eventsUrl = new URL(`https://api.us.nylas.com/v3/grants/${grantId}/events`)
            
            // Add date filters if provided
            if (startDate) {
              const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
              eventsUrl.searchParams.set('start', startTimestamp.toString())
            }
            if (endDate) {
              const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
              eventsUrl.searchParams.set('end', endTimestamp.toString())
            }
            
            // Limit to avoid too many events
            eventsUrl.searchParams.set('limit', '100')

            console.log(`[nylas-events] Fetching from URL: ${eventsUrl.toString()}`)

            const eventsResponse = await fetch(eventsUrl.toString(), {
              headers: {
                'Authorization': `Bearer ${nylasApiKey}`,
                'Content-Type': 'application/json',
              },
            })

            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json()
              console.log(`[nylas-events] Fetched ${eventsData.data?.length || 0} events from connection ${connection.id}`)

              // Transform events to include connection info
              const transformedEvents = (eventsData.data || []).map(event => ({
                id: event.id,
                title: event.title || 'Untitled Event',
                description: event.description || '',
                when: event.when,
                connection_id: connection.id,
                connection_email: connection.email,
                connection_provider: connection.provider,
                calendar_id: event.calendar_id || 'primary',
                calendar_name: event.calendar_name || 'Calendar',
                status: event.status,
                location: event.location,
                participants: event.participants || []
              }))

              allEvents.push(...transformedEvents)
            } else {
              const errorText = await eventsResponse.text()
              console.error(`[nylas-events] Failed to fetch events for connection ${connection.id}:`, {
                status: eventsResponse.status,
                statusText: eventsResponse.statusText,
                error: errorText
              })
              
              // Continue with other connections even if one fails
              continue
            }
          } catch (error) {
            console.error(`[nylas-events] Error processing connection ${connection.id}:`, error)
            // Continue with other connections even if one fails
            continue
          }
        }

        console.log(`[nylas-events] Total events fetched: ${allEvents.length}`)

        return new Response(
          JSON.stringify({ 
            events: allEvents,
            connections: connections.map(conn => ({
              id: conn.id,
              grant_id: conn.grant_id,
              email: conn.email,
              provider: conn.provider,
              is_active: conn.is_active
            })),
            total_events: allEvents.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Invalid action: ${action}`)
    }

  } catch (error) {
    console.error('[nylas-events] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        events: [],
        connections: []
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
