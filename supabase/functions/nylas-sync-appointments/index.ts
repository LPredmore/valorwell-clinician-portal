
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

    const { 
      action, 
      appointmentId, 
      clinicianId, 
      startDate, 
      endDate,
      syncDirection = 'both' 
    } = await req.json()

    const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
    if (!nylasApiKey) {
      throw new Error('Nylas configuration missing - NYLAS_API_KEY not found')
    }

    console.log(`[nylas-sync-appointments] Processing action: ${action}`, {
      appointmentId,
      clinicianId,
      startDate,
      endDate,
      syncDirection
    })

    switch (action) {
      case 'sync_appointment_to_calendar': {
        if (!appointmentId) {
          throw new Error('Appointment ID required')
        }

        console.log(`[nylas-sync-appointments] Syncing appointment ${appointmentId} to calendar`)

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
          console.error('[nylas-sync-appointments] Appointment not found:', appointmentError)
          throw new Error('Appointment not found')
        }

        console.log('[nylas-sync-appointments] Found appointment:', {
          id: appointment.id,
          clinician_id: appointment.clinician_id,
          start_at: appointment.start_at,
          end_at: appointment.end_at
        })

        // Get clinician's active connection
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', appointment.clinician_id)
          .eq('is_active', true)
          .limit(1)

        if (connectionsError || !connections || connections.length === 0) {
          console.error('[nylas-sync-appointments] No active connection found:', connectionsError)
          throw new Error('No active calendar connection found for this clinician')
        }

        const connection = connections[0]
        console.log('[nylas-sync-appointments] Using connection:', {
          id: connection.id,
          grant_id: connection.grant_id,
          email: connection.email,
          provider: connection.provider
        })

        // Create calendar event data
        const eventData = {
          title: `Appointment with ${appointment.clients?.client_first_name || 'Client'} ${appointment.clients?.client_last_name || ''}`.trim(),
          description: `Type: ${appointment.type}\nStatus: ${appointment.status}${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}`,
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
          calendar_id: 'primary',
        }

        // Add client email if available
        if (appointment.clients?.client_email) {
          eventData.participants.push({
            email: appointment.clients.client_email,
            status: 'noreply',
          })
        }

        console.log('[nylas-sync-appointments] Creating event with data:', eventData)

        // Use grant_id for the API call (this is the connection identifier Nylas expects)
        const grantId = connection.grant_id || connection.id
        const eventResponse = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nylasApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        })

        if (!eventResponse.ok) {
          const errorText = await eventResponse.text()
          console.error('[nylas-sync-appointments] Failed to create calendar event:', {
            status: eventResponse.status,
            statusText: eventResponse.statusText,
            error: errorText
          })
          throw new Error(`Failed to create calendar event: ${eventResponse.status} ${errorText}`)
        }

        const eventResult = await eventResponse.json()
        console.log('[nylas-sync-appointments] Calendar event created:', eventResult)

        // Store external event mapping with correct connection_id
        const { error: mappingError } = await supabaseClient
          .from('external_calendar_mappings')
          .insert({
            appointment_id: appointmentId,
            external_event_id: eventResult.data.id,
            connection_id: connection.id, // Use the database connection ID, not grant_id
            sync_direction: 'outbound',
          })

        if (mappingError) {
          console.error('[nylas-sync-appointments] Failed to store mapping:', mappingError)
          // Don't fail the whole operation if mapping storage fails
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            external_event_id: eventResult.data.id,
            message: 'Appointment synced to calendar successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        if (!appointmentId) {
          throw new Error('Appointment ID required')
        }

        console.log(`[nylas-sync-appointments] Deleting sync for appointment ${appointmentId}`)

        // Get existing mapping
        const { data: mapping, error: mappingError } = await supabaseClient
          .from('external_calendar_mappings')
          .select('*')
          .eq('appointment_id', appointmentId)
          .single()

        if (mappingError || !mapping) {
          console.log('[nylas-sync-appointments] No mapping found for appointment:', appointmentId)
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'No external calendar mapping found'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get connection details
        const { data: connection, error: connectionError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('id', mapping.connection_id)
          .single()

        if (connection && !connectionError) {
          // Delete the external calendar event
          try {
            const grantId = connection.grant_id || connection.id
            const deleteResponse = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/events/${mapping.external_event_id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${nylasApiKey}`,
              },
            })

            if (!deleteResponse.ok) {
              const errorText = await deleteResponse.text()
              console.error('[nylas-sync-appointments] Failed to delete external event:', {
                status: deleteResponse.status,
                error: errorText
              })
            } else {
              console.log('[nylas-sync-appointments] External event deleted successfully')
            }
          } catch (error) {
            console.error('[nylas-sync-appointments] Error deleting external event:', error)
          }
        }

        // Delete the mapping
        const { error: deleteError } = await supabaseClient
          .from('external_calendar_mappings')
          .delete()
          .eq('id', mapping.id)

        if (deleteError) {
          console.error('[nylas-sync-appointments] Failed to delete mapping:', deleteError)
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'External calendar mapping deleted'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'sync_calendar_to_appointments': {
        if (!clinicianId) {
          throw new Error('Clinician ID required')
        }

        console.log(`[nylas-sync-appointments] Syncing calendar events to appointments for clinician ${clinicianId}`)

        // Get clinician's connections
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', clinicianId)
          .eq('is_active', true)

        if (connectionsError || !connections || connections.length === 0) {
          return new Response(
            JSON.stringify({ success: true, synced_count: 0, message: 'No active connections found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        let totalSynced = 0

        for (const connection of connections) {
          try {
            console.log(`[nylas-sync-appointments] Processing connection: ${connection.id}`)
            
            // Get calendar events
            const grantId = connection.grant_id || connection.id
            const eventsUrl = new URL(`https://api.us.nylas.com/v3/grants/${grantId}/events`)
            if (startDate) eventsUrl.searchParams.set('start', Math.floor(new Date(startDate).getTime() / 1000).toString())
            if (endDate) eventsUrl.searchParams.set('end', Math.floor(new Date(endDate).getTime() / 1000).toString())

            const eventsResponse = await fetch(eventsUrl.toString(), {
              headers: {
                'Authorization': `Bearer ${nylasApiKey}`,
              },
            })

            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json()
              console.log(`[nylas-sync-appointments] Found ${eventsData.data?.length || 0} events for connection ${connection.id}`)
              
              for (const event of eventsData.data || []) {
                // Check if event is already mapped
                const { data: existingMapping } = await supabaseClient
                  .from('external_calendar_mappings')
                  .select('*')
                  .eq('external_event_id', event.id)
                  .eq('connection_id', connection.id)
                  .single()

                if (!existingMapping) {
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
                      notes: `Synced from ${connection.provider}: ${event.title || 'Untitled Event'}`,
                    })
                    .select()
                    .single()

                  if (!appointmentError && newAppointment) {
                    // Create mapping
                    await supabaseClient
                      .from('external_calendar_mappings')
                      .insert({
                        appointment_id: newAppointment.id,
                        external_event_id: event.id,
                        connection_id: connection.id,
                        sync_direction: 'inbound',
                      })

                    totalSynced++
                    console.log(`[nylas-sync-appointments] Created appointment ${newAppointment.id} from external event ${event.id}`)
                  }
                }
              }
            } else {
              const errorText = await eventsResponse.text()
              console.error(`[nylas-sync-appointments] Failed to fetch events for connection ${connection.id}:`, {
                status: eventsResponse.status,
                error: errorText
              })
            }
          } catch (error) {
            console.error(`[nylas-sync-appointments] Error syncing connection ${connection.id}:`, error)
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            synced_count: totalSynced,
            message: `Synced ${totalSynced} events from external calendar`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Invalid action: ${action}`)
    }

  } catch (error) {
    console.error('[nylas-sync-appointments] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
