
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createEventHash } from '../utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function syncCalendarToAppointments(supabaseClient: SupabaseClient, body: any): Promise<Response> {
  const { clinicianId, startDate, endDate } = body;
  if (!clinicianId) {
    return new Response(
      JSON.stringify({ 
        error: 'Clinician ID required',
        code: 'MISSING_CLINICIAN_ID',
        details: 'A clinician ID must be provided'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: connections, error: connectionsError } = await supabaseClient
    .from('nylas_connections')
    .select('*')
    .eq('user_id', clinicianId)
    .eq('is_active', true)

  if (connectionsError) {
    console.error('[syncFromCalendar] Database error fetching connections:', connectionsError)
    return new Response(JSON.stringify({ error: 'Failed to fetch connections' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!connections || connections.length === 0) {
    return new Response(JSON.stringify({ success: true, message: "No active connections to sync." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let totalCreated = 0
  let totalUpdated = 0
  let totalDeleted = 0
  const errors: any[] = []

  for (const connection of connections) {
    try {
      console.log(`[syncFromCalendar] Processing connection ${connection.id} for clinician ${clinicianId}`)
      
      const eventsUrl = new URL(`https://api.us.nylas.com/v3/grants/${connection.id}/events`)
      if (startDate) eventsUrl.searchParams.set('start', (new Date(startDate).getTime() / 1000).toString());
      if (endDate) eventsUrl.searchParams.set('end', (new Date(endDate).getTime() / 1000).toString());
      
      const eventsResponse = await fetch(eventsUrl.toString(), {
        headers: { 'Authorization': `Bearer ${connection.access_token}` },
      })

      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text()
        console.error(`[syncFromCalendar] Error fetching events for connection ${connection.id}:`, errorText)
        errors.push({ connection_id: connection.id, error: 'Failed to fetch events', details: errorText });
        continue;
      }

      const eventsData = await eventsResponse.json();
      const nylasEvents = eventsData.data || [];
      const nylasEventIds = new Set(nylasEvents.map((e: any) => e.id));
      console.log(`[syncFromCalendar] Found ${nylasEvents.length} events in external calendar.`);

      const { data: existingMappings, error: mappingError } = await supabaseClient
        .from('external_calendar_mappings')
        .select('*, appointments(start_at)')
        .eq('connection_id', connection.id);

      if (mappingError) {
        errors.push({ connection_id: connection.id, error: 'Failed to fetch mappings', details: mappingError.message });
        continue;
      }

      const mappingsByExternalId = new Map(existingMappings.map((m: any) => [m.external_event_id, m]));

      for (const event of nylasEvents) {
        const eventHash = createEventHash(event);
        const existingMapping = mappingsByExternalId.get(event.id);

        if (existingMapping) {
          if (existingMapping.last_sync_hash !== eventHash) {
            console.log(`[syncFromCalendar] Updating appointment for event ${event.id}`);
            const { error: updateError } = await supabaseClient
              .from('appointments')
              .update({
                start_at: new Date(event.when.start_time * 1000).toISOString(),
                end_at: new Date(event.when.end_time * 1000).toISOString(),
                notes: `(Updated) Synced from ${connection.provider}: ${event.title}`,
              })
              .eq('id', existingMapping.appointment_id);
            
            if (updateError) {
              errors.push({ event_id: event.id, error: 'Failed to update appointment', details: updateError.message });
            } else {
              await supabaseClient.from('external_calendar_mappings').update({ last_sync_hash: eventHash }).eq('id', existingMapping.id);
              totalUpdated++;
            }
          }
        } else {
          console.log(`[syncFromCalendar] Creating new appointment for event ${event.id}`);
          const { data: newAppointment, error: createError } = await supabaseClient
            .from('appointments')
            .insert({
              clinician_id: clinicianId,
              type: 'External Event',
              status: 'scheduled',
              start_at: new Date(event.when.start_time * 1000).toISOString(),
              end_at: new Date(event.when.end_time * 1000).toISOString(),
              notes: `Synced from ${connection.provider}: ${event.title}`,
            })
            .select()
            .single();

          if (createError) {
            errors.push({ event_id: event.id, error: 'Failed to create appointment', details: createError.message });
          } else {
            await supabaseClient.from('external_calendar_mappings').insert({
              appointment_id: newAppointment.id,
              external_event_id: event.id,
              connection_id: connection.id,
              sync_direction: 'inbound',
              last_sync_hash: eventHash,
            });
            totalCreated++;
          }
        }
      }

      for (const mapping of existingMappings) {
         if (!mapping.appointments) continue;
         const appointmentDate = new Date(mapping.appointments.start_at);
         const isWithinRange = (!startDate || appointmentDate >= new Date(startDate)) && (!endDate || appointmentDate <= new Date(endDate));

        if (isWithinRange && !nylasEventIds.has(mapping.external_event_id)) {
          console.log(`[syncFromCalendar] Deleting (cancelling) appointment for event ${mapping.external_event_id}`);
          const { error: cancelError } = await supabaseClient
            .from('appointments')
            .update({ status: 'cancelled', notes: 'Cancelled: Event deleted from external calendar.' })
            .eq('id', mapping.appointment_id);

          if (cancelError) {
             errors.push({ appointment_id: mapping.appointment_id, error: 'Failed to cancel appointment', details: cancelError.message });
          } else {
            await supabaseClient.from('external_calendar_mappings').delete().eq('id', mapping.id);
            totalDeleted++;
          }
        }
      }
    } catch (connectionError) {
      console.error(`[syncFromCalendar] Error processing connection ${connection.id}:`, connectionError)
      errors.push({ connection_id: connection.id, error: 'Connection processing error', details: connectionError.message });
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      created: totalCreated,
      updated: totalUpdated,
      deleted: totalDeleted,
      errors: errors.length > 0 ? errors : undefined
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
