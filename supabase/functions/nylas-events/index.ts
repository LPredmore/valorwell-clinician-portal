
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EventsRequest {
  action: 'fetch_events'
  startDate?: string
  endDate?: string
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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, startDate, endDate }: EventsRequest = await req.json()

    if (action === 'fetch_events') {
      // Get user's active Nylas connections
      const { data: connections, error: connError } = await supabaseClient
        .from('nylas_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (connError || !connections?.length) {
        return new Response(
          JSON.stringify({ events: [], connections: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const allEvents = []

      for (const connection of connections) {
        try {
          // Fetch calendars for this connection first
          const calendarsResponse = await fetch(`https://api.nylas.com/v3/grants/${connection.grant_id}/calendars`, {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
            }
          })

          if (!calendarsResponse.ok) {
            console.error(`Failed to fetch calendars for connection ${connection.id}`)
            continue
          }

          const calendarsData = await calendarsResponse.json()
          const calendars = calendarsData.data || []

          // Update connection with calendar IDs if not already stored
          if (!connection.calendar_ids || connection.calendar_ids.length === 0) {
            const calendarIds = calendars.map((cal: any) => cal.id)
            await supabaseClient
              .from('nylas_connections')
              .update({ calendar_ids: calendarIds })
              .eq('id', connection.id)
          }

          // Fetch events from each calendar
          for (const calendar of calendars) {
            const eventsUrl = new URL(`https://api.nylas.com/v3/grants/${connection.grant_id}/events`)
            eventsUrl.searchParams.set('calendar_id', calendar.id)
            
            if (startDate) {
              eventsUrl.searchParams.set('start', startDate)
            }
            if (endDate) {
              eventsUrl.searchParams.set('end', endDate)
            }

            const eventsResponse = await fetch(eventsUrl.toString(), {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
              }
            })

            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json()
              const events = eventsData.data || []
              
              // Add connection and calendar info to each event
              const enrichedEvents = events.map((event: any) => ({
                ...event,
                connection_id: connection.id,
                connection_email: connection.email,
                connection_provider: connection.provider,
                calendar_id: calendar.id,
                calendar_name: calendar.name
              }))

              allEvents.push(...enrichedEvents)
            }
          }
        } catch (error) {
          console.error(`Error fetching events for connection ${connection.id}:`, error)
          continue
        }
      }

      return new Response(
        JSON.stringify({ 
          events: allEvents,
          connections: connections.map(conn => ({
            id: conn.id,
            email: conn.email,
            provider: conn.provider
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Nylas events error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
