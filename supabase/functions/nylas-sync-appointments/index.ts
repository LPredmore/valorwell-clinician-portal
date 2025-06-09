
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  action: 'sync_to_external' | 'sync_from_external'
  appointmentId?: string
  connectionId?: string
  force?: boolean
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

    const { action, appointmentId, connectionId, force = false }: SyncRequest = await req.json()

    switch (action) {
      case 'sync_to_external': {
        if (!appointmentId) {
          throw new Error('Appointment ID required')
        }

        // Get appointment details
        const { data: appointment, error: aptError } = await supabaseClient
          .from('appointments')
          .select(`
            *,
            client:clients(*)
          `)
          .eq('id', appointmentId)
          .single()

        if (aptError || !appointment) {
          throw new Error('Appointment not found')
        }

        // Get user's active Nylas connections
        const { data: connections, error: connError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (connError || !connections?.length) {
          throw new Error('No active calendar connections found')
        }

        const results = []

        for (const connection of connections) {
          try {
            // Check if appointment is already synced to this connection
            if (!force) {
              const { data: existingMapping } = await supabaseClient
                .from('external_calendar_mappings')
                .select('*')
                .eq('appointment_id', appointmentId)
                .eq('connection_id', connection.id)
                .single()

              if (existingMapping) {
                results.push({ connection: connection.email, status: 'already_synced' })
                continue
              }
            }

            // Create event in external calendar via Nylas
            const eventData = {
              title: `Appointment with ${appointment.client?.client_preferred_name || appointment.client?.client_first_name} ${appointment.client?.client_last_name}`,
              description: `ValorWell appointment - ${appointment.type}`,
              start: {
                time: Math.floor(new Date(appointment.start_at).getTime() / 1000),
                timezone: appointment.appointment_timezone || 'UTC'
              },
              end: {
                time: Math.floor(new Date(appointment.end_at).getTime() / 1000),
                timezone: appointment.appointment_timezone || 'UTC'
              },
              location: appointment.video_room_url || 'Video Session'
            }

            const createResponse = await fetch(`https://api.nylas.com/v3/grants/${connection.grant_id}/events`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(eventData)
            })

            if (!createResponse.ok) {
              const error = await createResponse.text()
              throw new Error(`Failed to create external event: ${error}`)
            }

            const createdEvent = await createResponse.json()

            // Store mapping in database
            await supabaseClient
              .from('external_calendar_mappings')
              .upsert({
                appointment_id: appointmentId,
                connection_id: connection.id,
                external_event_id: createdEvent.id,
                external_calendar_id: createdEvent.calendar_id,
                last_synced_at: new Date().toISOString()
              })

            // Log sync operation
            await supabaseClient
              .from('calendar_sync_logs')
              .insert({
                connection_id: connection.id,
                sync_type: 'outbound',
                operation: 'create',
                appointment_id: appointmentId,
                external_event_id: createdEvent.id,
                status: 'success',
                sync_data: { eventData, response: createdEvent }
              })

            results.push({ 
              connection: connection.email, 
              status: 'synced', 
              externalEventId: createdEvent.id 
            })

          } catch (error) {
            console.error(`Sync error for connection ${connection.email}:`, error)
            
            // Log failed sync
            await supabaseClient
              .from('calendar_sync_logs')
              .insert({
                connection_id: connection.id,
                sync_type: 'outbound',
                operation: 'create',
                appointment_id: appointmentId,
                status: 'failed',
                error_message: error.message
              })

            results.push({ 
              connection: connection.email, 
              status: 'failed', 
              error: error.message 
            })
          }
        }

        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'sync_from_external': {
        // This will be implemented for webhook handling
        // For now, return placeholder
        return new Response(
          JSON.stringify({ success: true, message: 'Inbound sync not yet implemented' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
