
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'unsafe-none'
}

// Validation schema for request body
interface SyncAppointmentRequest {
  appointmentId?: string;
  action: 'create' | 'update' | 'delete';
  nylasCalendarId?: string;
  eventId?: string;
  event?: {
    start: string;
    end: string;
    title: string;
  };
}

function validateRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body.action || !['create', 'update', 'delete'].includes(body.action)) {
    errors.push('Invalid or missing action. Must be create, update, or delete');
  }
  
  if (body.action === 'create' && !body.appointmentId && !body.event) {
    errors.push('Either appointmentId or event object required for create action');
  }
  
  if ((body.action === 'update' || body.action === 'delete') && !body.eventId) {
    errors.push('eventId required for update/delete actions');
  }
  
  return { isValid: errors.length === 0, errors };
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid auth header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    const requestBody = await req.json()
    const { isValid, errors } = validateRequest(requestBody)
    
    if (!isValid) {
      console.error('[nylas-sync-appointments] Validation errors:', errors)
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      appointmentId, 
      action, 
      nylasCalendarId, 
      eventId,
      event
    }: SyncAppointmentRequest = requestBody

    const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
    if (!nylasApiKey) {
      throw new Error('Nylas configuration missing - NYLAS_API_KEY not found')
    }

    console.log(`[nylas-sync-appointments] Processing action: ${action}`, {
      appointmentId,
      nylasCalendarId,
      eventId,
      hasEvent: !!event
    })

    switch (action) {
      case 'create': {
        if (appointmentId) {
          // Sync RBC appointment to Google Calendar
          console.log(`[nylas-sync-appointments] Syncing RBC appointment ${appointmentId} to calendar`)

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

          // Create calendar event data with IANA timezone
          const eventData = {
            title: `Appointment with ${appointment.clients?.client_first_name || 'Client'} ${appointment.clients?.client_last_name || ''}`.trim(),
            description: `Type: ${appointment.type}\nStatus: ${appointment.status}${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}`,
            when: {
              start_time: Math.floor(new Date(appointment.start_at).getTime() / 1000),
              end_time: Math.floor(new Date(appointment.end_at).getTime() / 1000),
              start_timezone: appointment.appointment_timezone || 'America/New_York',
              end_timezone: appointment.appointment_timezone || 'America/New_York'
            },
            participants: [
              {
                email: connection.email,
                status: 'yes',
              },
            ],
            calendar_id: nylasCalendarId || 'primary',
          }

          // Add client email if available
          if (appointment.clients?.client_email) {
            eventData.participants.push({
              email: appointment.clients.client_email,
              status: 'noreply',
            })
          }

          console.log('[nylas-sync-appointments] Creating event with data:', eventData)

          // Use grant_id for the API call
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
            console.error('[nylas-sync-appointments] Failed to store mapping:', mappingError)
          }

          return new Response(
            JSON.stringify({ 
              success: true,
              external_event_id: eventResult.data.id,
              message: 'RBC appointment synced to calendar successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } else if (event) {
          // Sync Google Calendar busy event to RBC
          console.log('[nylas-sync-appointments] Creating RBC appointment from Google event')

          const { data: newAppointment, error: appointmentError } = await supabaseClient
            .from('appointments')
            .insert({
              clinician_id: user.id,
              client_id: null, // External events don't have client mapping
              type: 'Busy - External Event',
              status: 'scheduled',
              start_at: event.start,
              end_at: event.end,
              notes: `Synced from external calendar: ${event.title}`,
              appointment_timezone: 'America/New_York' // Default timezone
            })
            .select()
            .single()

          if (appointmentError || !newAppointment) {
            console.error('[nylas-sync-appointments] Failed to create RBC appointment:', appointmentError)
            throw new Error('Failed to create RBC appointment from external event')
          }

          console.log('[nylas-sync-appointments] Created RBC appointment:', newAppointment.id)

          return new Response(
            JSON.stringify({ 
              success: true,
              appointment_id: newAppointment.id,
              message: 'External event synced to RBC calendar successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      case 'update': {
        if (!eventId) {
          throw new Error('eventId required for update action')
        }

        // Get existing mapping
        const { data: mapping, error: mappingError } = await supabaseClient
          .from('external_calendar_mappings')
          .select('*')
          .eq('external_event_id', eventId)
          .single()

        if (mappingError || !mapping) {
          console.log('[nylas-sync-appointments] No mapping found for event:', eventId)
          throw new Error('No sync mapping found for this event')
        }

        // Get appointment details
        const { data: appointment, error: appointmentError } = await supabaseClient
          .from('appointments')
          .select('*')
          .eq('id', mapping.appointment_id)
          .single()

        if (appointmentError || !appointment) {
          throw new Error('Associated appointment not found')
        }

        // Get connection details
        const { data: connection, error: connectionError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('id', mapping.connection_id)
          .single()

        if (connectionError || !connection) {
          throw new Error('Calendar connection not found')
        }

        // Update the external calendar event
        const grantId = connection.grant_id || connection.id
        const updateData = {
          title: `Appointment with Client`,
          when: {
            start_time: Math.floor(new Date(appointment.start_at).getTime() / 1000),
            end_time: Math.floor(new Date(appointment.end_at).getTime() / 1000),
            start_timezone: appointment.appointment_timezone || 'America/New_York',
            end_timezone: appointment.appointment_timezone || 'America/New_York'
          }
        }

        const updateResponse = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${nylasApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error('[nylas-sync-appointments] Failed to update external event:', {
            status: updateResponse.status,
            error: errorText
          })
          throw new Error(`Failed to update external calendar event: ${updateResponse.status}`)
        }

        console.log('[nylas-sync-appointments] External event updated successfully')

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'External calendar event updated successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        if (!eventId) {
          throw new Error('eventId required for delete action')
        }

        // Get existing mapping
        const { data: mapping, error: mappingError } = await supabaseClient
          .from('external_calendar_mappings')
          .select('*')
          .eq('external_event_id', eventId)
          .single()

        if (mappingError || !mapping) {
          console.log('[nylas-sync-appointments] No mapping found for event:', eventId)
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
            const deleteResponse = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/events/${eventId}`, {
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
