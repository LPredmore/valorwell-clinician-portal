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
    console.log('[nylas-sync-appointments] Request received:', req.method, req.url)
    
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
      console.error('[nylas-sync-appointments] No authorization header')
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
      console.error('[nylas-sync-appointments] Authentication failed:', authError)
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

    console.log('[nylas-sync-appointments] Authenticated user:', user.id)

    const { 
      action, 
      appointmentId, 
      clinicianId, 
      startDate, 
      endDate,
      syncDirection = 'both' 
    } = await req.json()

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

    // Check for check-config action
    if (action === 'check-config') {
      const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID')
      const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
      const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
      
      const missingConfig = []
      if (!nylasClientId) missingConfig.push('NYLAS_CLIENT_ID')
      if (!nylasClientSecret) missingConfig.push('NYLAS_CLIENT_SECRET')
      if (!nylasApiKey) missingConfig.push('NYLAS_API_KEY')

      if (missingConfig.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Nylas configuration missing',
            missing: missingConfig,
            details: `Missing environment variables: ${missingConfig.join(', ')}`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          status: 'ok',
          message: 'Nylas configuration is valid',
          config: {
            hasClientId: true,
            hasClientSecret: true,
            hasApiKey: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    if (!nylasClientSecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Nylas configuration missing',
          code: 'CONFIG_MISSING',
          details: 'NYLAS_CLIENT_SECRET is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    switch (action) {
      case 'sync_appointment_to_calendar': {
        if (!appointmentId) {
          return new Response(
            JSON.stringify({ 
              error: 'Appointment ID required',
              code: 'MISSING_APPOINTMENT_ID',
              details: 'An appointment ID must be provided'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Get appointment details
        const { data: appointment, error: appointmentError } = await supabaseClient
          .from('appointments')
          .select(`
            *,
            clients(client_first_name, client_last_name, client_email),
            clinicians(clinician_first_name, clinician_last_name)
          `)
          .eq('id', appointmentId)
          .single()

        if (appointmentError || !appointment) {
          console.error('[nylas-sync-appointments] Database error:', appointmentError)
          return new Response(
            JSON.stringify({ 
              error: 'Appointment not found',
              code: 'DB_ERROR',
              details: appointmentError?.message || 'The appointment could not be found'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Get clinician's connection
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', appointment.clinician_id)
          .eq('is_active', true)
          .limit(1)

        if (connectionsError) {
          console.error('[nylas-sync-appointments] Database error:', connectionsError)
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
            JSON.stringify({ 
              error: 'No active calendar connection found',
              code: 'NO_ACTIVE_CONNECTION',
              details: 'The clinician does not have an active calendar connection'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const connection = connections[0]

        // Create calendar event
        const eventData = {
          title: `Appointment with ${appointment.clients?.client_first_name} ${appointment.clients?.client_last_name}`,
          description: `Type: ${appointment.type}\nStatus: ${appointment.status}`,
          when: {
            start_time: Math.floor(new Date(appointment.start_at).getTime() / 1000),
            end_time: Math.floor(new Date(appointment.end_at).getTime() / 1000),
          },
          participants: [
            {
              email: connection.email,
              status: 'yes',
            },
          ],
          calendar_id: connection.calendar_ids?.[0] || 'primary',
        }

        if (appointment.clients?.client_email) {
          eventData.participants.push({
            email: appointment.clients.client_email,
            status: 'noreply',
          })
        }

        console.log('[nylas-sync-appointments] Creating calendar event for appointment:', appointmentId)
        
        const eventResponse = await fetch(`https://api.us.nylas.com/v3/grants/${connection.id}/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        })

        if (!eventResponse.ok) {
          const error = await eventResponse.text()
          console.error('[nylas-sync-appointments] Failed to create calendar event:', eventResponse.status, error)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create calendar event',
              code: 'API_ERROR',
              details: error
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const eventResult = await eventResponse.json()
        console.log('[nylas-sync-appointments] Calendar event created successfully:', eventResult.data.id)

        // Store external event mapping
        const { error: mappingError } = await supabaseClient
          .from('external_calendar_mappings')
          .insert({
            appointment_id: appointmentId,
            external_event_id: eventResult.data.id,
            connection_id: connection.id,
            sync_direction: 'outbound',
          })

        if (mappingError) {
          console.error('[nylas-sync-appointments] Database error:', mappingError)
          // We don't return an error here since the event was created successfully
          // Just log the error and continue
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            external_event_id: eventResult.data.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'sync_calendar_to_appointments': {
        if (!clinicianId) {
          return new Response(
            JSON.stringify({ 
              error: 'Clinician ID required',
              code: 'MISSING_CLINICIAN_ID',
              details: 'A clinician ID must be provided'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Get clinician's connections
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', clinicianId)
          .eq('is_active', true)

        if (connectionsError) {
          console.error('[nylas-sync-appointments] Database error:', connectionsError)
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
            JSON.stringify({ success: true, synced_count: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        let totalSynced = 0
        const errors = []

        for (const connection of connections) {
          try {
            console.log(`[nylas-sync-appointments] Processing connection ${connection.id} for clinician ${clinicianId}`)
            
            // Get calendar events
            const eventsUrl = new URL(`https://api.us.nylas.com/v3/grants/${connection.id}/events`)
            if (startDate) eventsUrl.searchParams.set('start', new Date(startDate).getTime().toString())
            if (endDate) eventsUrl.searchParams.set('end', new Date(endDate).getTime().toString())

            const eventsResponse = await fetch(eventsUrl.toString(), {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
              },
            })

            if (!eventsResponse.ok) {
              const error = await eventsResponse.text()
              console.error(`[nylas-sync-appointments] Error fetching events for connection ${connection.id}:`, eventsResponse.status, error)
              errors.push({
                connection_id: connection.id,
                error: 'Failed to fetch events',
                details: error
              })
              continue
            }

            const eventsData = await eventsResponse.json()
            console.log(`[nylas-sync-appointments] Received ${eventsData.data?.length || 0} events for connection ${connection.id}`)
            
            for (const event of eventsData.data || []) {
              try {
                // Check if event is already mapped
                const { data: existingMapping } = await supabaseClient
                  .from('external_calendar_mappings')
                  .select('*')
                  .eq('external_event_id', event.id)
                  .eq('connection_id', connection.id)
                  .single()

                if (!existingMapping) {
                  console.log(`[nylas-sync-appointments] Creating new appointment for event ${event.id}`)
                  
                  // Create appointment from calendar event
                  const { data: newAppointment, error: appointmentError } = await supabaseClient
                    .from('appointments')
                    .insert({
                      clinician_id: clinicianId,
                      client_id: null, // External events don't have client mapping
                      type: 'External Event',
                      status: 'scheduled',
                      start_at: new Date(event.when.start_time * 1000).toISOString(),
                      end_at: new Date(event.when.end_time * 1000).toISOString(),
                      notes: `Synced from ${connection.provider}: ${event.title}`,
                    })
                    .select()
                    .single()

                  if (appointmentError) {
                    console.error(`[nylas-sync-appointments] Error creating appointment for event ${event.id}:`, appointmentError)
                    continue
                  }

                  if (newAppointment) {
                    // Create mapping
                    const { error: mappingError } = await supabaseClient
                      .from('external_calendar_mappings')
                      .insert({
                        appointment_id: newAppointment.id,
                        external_event_id: event.id,
                        connection_id: connection.id,
                        sync_direction: 'inbound',
                      })

                    if (mappingError) {
                      console.error(`[nylas-sync-appointments] Error creating mapping for event ${event.id}:`, mappingError)
                      continue
                    }

                    totalSynced++
                    console.log(`[nylas-sync-appointments] Successfully synced event ${event.id} to appointment ${newAppointment.id}`)
                  }
                } else {
                  console.log(`[nylas-sync-appointments] Event ${event.id} already mapped, skipping`)
                }
              } catch (eventError) {
                console.error(`[nylas-sync-appointments] Error processing event ${event.id}:`, eventError)
                // Continue with other events
              }
            }
          } catch (connectionError) {
            console.error(`[nylas-sync-appointments] Error processing connection ${connection.id}:`, connectionError)
            errors.push({
              connection_id: connection.id,
              error: 'Connection processing error',
              details: connectionError.message
            })
            // Continue with other connections
          }
        }

        const response = { 
          success: true,
          synced_count: totalSynced 
        }
        
        // Only include errors if there are any
        if (errors.length > 0) {
          response.errors = errors
        }

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'sync_bidirectional': {
        return new Response(
          JSON.stringify({ 
            error: 'Not implemented',
            code: 'NOT_IMPLEMENTED',
            details: 'Bidirectional sync functionality is not yet implemented'
          }),
          { 
            status: 501,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action',
            code: 'INVALID_ACTION',
            details: `Action '${action}' is not supported`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('[nylas-sync-appointments] Error:', error)
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
