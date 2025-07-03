
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

    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    if (!nylasClientSecret) {
      throw new Error('Nylas configuration missing')
    }

    switch (action) {
      case 'sync_appointment_to_calendar': {
        if (!appointmentId) {
          throw new Error('Appointment ID required')
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
          throw new Error('Appointment not found')
        }

        // Get clinician's connection
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', appointment.clinician_id)
          .eq('is_active', true)
          .limit(1)

        if (connectionsError || !connections || connections.length === 0) {
          throw new Error('No active calendar connection found')
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

        const eventResponse = await fetch(`https://api.nylas.com/v3/grants/${connection.id}/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        })

        if (!eventResponse.ok) {
          const error = await eventResponse.text()
          throw new Error(`Failed to create calendar event: ${error}`)
        }

        const eventResult = await eventResponse.json()

        // Store external event mapping
        await supabaseClient
          .from('external_calendar_mappings')
          .insert({
            appointment_id: appointmentId,
            external_event_id: eventResult.data.id,
            connection_id: connection.id,
            sync_direction: 'outbound',
          })

        return new Response(
          JSON.stringify({ 
            success: true,
            external_event_id: eventResult.data.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        if (!appointmentId) {
          throw new Error('Appointment ID required')
        }

        // Get existing mapping
        const { data: mapping, error: mappingError } = await supabaseClient
          .from('external_calendar_mappings')
          .select('*')
          .eq('appointment_id', appointmentId)
          .single()

        if (mappingError || !mapping) {
          // No mapping exists, nothing to delete
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
            const deleteResponse = await fetch(`https://api.nylas.com/v3/grants/${connection.id}/events/${mapping.external_event_id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
              },
            })

            if (!deleteResponse.ok) {
              console.error('Failed to delete external calendar event:', await deleteResponse.text())
              // Continue with mapping deletion even if external delete fails
            }
          } catch (error) {
            console.error('Error deleting external calendar event:', error)
            // Continue with mapping deletion even if external delete fails
          }
        }

        // Delete the mapping
        await supabaseClient
          .from('external_calendar_mappings')
          .delete()
          .eq('id', mapping.id)

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

        // Get clinician's connections
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', clinicianId)
          .eq('is_active', true)

        if (connectionsError || !connections || connections.length === 0) {
          return new Response(
            JSON.stringify({ success: true, synced_count: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        let totalSynced = 0

        for (const connection of connections) {
          try {
            // Get calendar events
            const eventsUrl = new URL(`https://api.nylas.com/v3/grants/${connection.id}/events`)
            if (startDate) eventsUrl.searchParams.set('start', new Date(startDate).getTime().toString())
            if (endDate) eventsUrl.searchParams.set('end', new Date(endDate).getTime().toString())

            const eventsResponse = await fetch(eventsUrl.toString(), {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
              },
            })

            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json()
              
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
                      notes: `Synced from ${connection.provider}: ${event.title}`,
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
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error syncing connection ${connection.id}:`, error)
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            synced_count: totalSynced 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'sync_bidirectional': {
        // Implement bidirectional sync (combination of above)
        throw new Error('Bidirectional sync not yet implemented')
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Nylas sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
