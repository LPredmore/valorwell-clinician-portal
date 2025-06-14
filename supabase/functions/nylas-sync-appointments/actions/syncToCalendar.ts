
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function syncAppointmentToCalendar(supabaseClient: SupabaseClient, body: any): Promise<Response> {
  const { appointmentId } = body;
  if (!appointmentId) {
    return new Response(
      JSON.stringify({ 
        error: 'Appointment ID required',
        code: 'MISSING_APPOINTMENT_ID',
        details: 'An appointment ID must be provided'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    return new Response(
      JSON.stringify({ 
        error: 'Appointment not found',
        code: 'DB_ERROR',
        details: appointmentError?.message || 'The appointment could not be found'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch connections',
        code: 'DB_ERROR',
        details: connectionsError.message
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!connections || connections.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: 'No active calendar connection found',
        code: 'NO_ACTIVE_CONNECTION',
        details: 'The clinician does not have an active calendar connection'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

  console.log('[syncToCalendar] Creating calendar event for appointment:', appointmentId)
  
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
    console.error('[syncToCalendar] Failed to create calendar event:', eventResponse.status, error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create calendar event',
        code: 'API_ERROR',
        details: error
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const eventResult = await eventResponse.json()
  console.log('[syncToCalendar] Calendar event created successfully:', eventResult.data.id)

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
    console.error('[syncToCalendar] Database error:', mappingError)
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      external_event_id: eventResult.data.id 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
