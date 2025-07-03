
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

    const { action, startDate, endDate, calendarId } = await req.json()

    const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
    if (!nylasApiKey) {
      throw new Error('Nylas configuration missing - NYLAS_API_KEY not found')
    }

    console.log('[nylas-events] ENHANCED: Processing request:', {
      action,
      userId: user.id,
      startDate,
      endDate,
      calendarId
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

        console.log(`[nylas-events] ENHANCED: Found ${connections.length} active connections`)

        const allEvents = []

        for (const connection of connections) {
          try {
            console.log(`[nylas-events] ENHANCED: Processing connection: ${connection.id}`)
            
            // Use grant_id for API calls
            const grantId = connection.grant_id || connection.id
            
            // First, get available calendars for this connection
            const calendarsUrl = `https://api.us.nylas.com/v3/grants/${grantId}/calendars`
            console.log(`[nylas-events] ENHANCED: Fetching calendars from: ${calendarsUrl}`)

            const calendarsResponse = await fetch(calendarsUrl, {
              headers: {
                'Authorization': `Bearer ${nylasApiKey}`,
                'Content-Type': 'application/json',
              },
            })

            if (!calendarsResponse.ok) {
              const errorText = await calendarsResponse.text()
              console.error(`[nylas-events] ENHANCED: Failed to fetch calendars for connection ${connection.id}:`, {
                status: calendarsResponse.status,
                error: errorText
              })
              continue
            }

            const calendarsData = await calendarsResponse.json()
            const availableCalendars = calendarsData.data || []
            console.log(`[nylas-events] ENHANCED: Found ${availableCalendars.length} calendars for connection ${connection.id}`)

            // If a specific calendar ID was requested, filter to that calendar
            const calendarsToFetch = calendarId 
              ? availableCalendars.filter(cal => cal.id === calendarId)
              : availableCalendars.filter(cal => cal.is_primary) // Default to primary calendar only

            if (calendarsToFetch.length === 0) {
              console.log(`[nylas-events] ENHANCED: No matching calendars found for connection ${connection.id}`)
              continue
            }

            // Fetch events for each calendar
            for (const calendar of calendarsToFetch) {
              console.log(`[nylas-events] ENHANCED: Fetching events for calendar: ${calendar.id} (${calendar.name})`)
              
              const eventsUrl = new URL(`https://api.us.nylas.com/v3/grants/${grantId}/events`)
              
              // Add calendar filter
              eventsUrl.searchParams.set('calendar_id', calendar.id)
              
              // Add date filters if provided (enhanced with proper formatting)
              if (startDate) {
                const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
                eventsUrl.searchParams.set('starts_after', startTimestamp.toString())
              }
              if (endDate) {
                const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
                eventsUrl.searchParams.set('ends_before', endTimestamp.toString())
              }
              
              // Limit to avoid too many events and exclude all-day events for "busy" sync
              eventsUrl.searchParams.set('limit', '50')
              eventsUrl.searchParams.set('expand_recurring', 'false')

              console.log(`[nylas-events] ENHANCED: Fetching from URL: ${eventsUrl.toString()}`)

              const eventsResponse = await fetch(eventsUrl.toString(), {
                headers: {
                  'Authorization': `Bearer ${nylasApiKey}`,
                  'Content-Type': 'application/json',
                },
              })

              if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json()
                console.log(`[nylas-events] ENHANCED: Fetched ${eventsData.data?.length || 0} events from calendar ${calendar.id}`)

                // Transform events and filter out all-day events (for busy sync)
                const transformedEvents = (eventsData.data || [])
                  .filter(event => {
                    // Filter out all-day events - we only want "busy" events
                    return event.when && event.when.object === 'timespan' && 
                           event.when.start_time && event.when.end_time
                  })
                  .map(event => ({
                    id: event.id,
                    title: event.title || 'Busy',
                    description: event.description || '',
                    when: event.when,
                    connection_id: connection.id,
                    connection_email: connection.email,
                    connection_provider: connection.provider,
                    calendar_id: calendar.id,
                    calendar_name: calendar.name,
                    status: event.status,
                    location: event.location,
                    participants: event.participants || []
                  }))

                allEvents.push(...transformedEvents)
              } else {
                const errorText = await eventsResponse.text()
                console.error(`[nylas-events] ENHANCED: Failed to fetch events for calendar ${calendar.id}:`, {
                  status: eventsResponse.status,
                  statusText: eventsResponse.statusText,
                  error: errorText
                })
              }
            }
          } catch (error) {
            console.error(`[nylas-events] ENHANCED: Error processing connection ${connection.id}:`, error)
            continue
          }
        }

        console.log(`[nylas-events] ENHANCED: Total events fetched (filtered for busy sync): ${allEvents.length}`)

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
            total_events: allEvents.length,
            date_range: { startDate, endDate },
            filtered_for_busy: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Invalid action: ${action}`)
    }

  } catch (error) {
    console.error('[nylas-events] ENHANCED: Error:', error)
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
