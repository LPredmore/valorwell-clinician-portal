
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createEventHash, getRefreshedNylasConnection, NylasConnection } from '../utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function syncBidirectional(supabaseClient: SupabaseClient, body: any): Promise<Response> {
  const { clinicianId, startDate, endDate } = body;
  console.log(`[syncBidirectional] Bidirectional sync started for clinician: ${clinicianId}`);
  if (!clinicianId || !startDate || !endDate) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing parameters',
        code: 'MISSING_PARAMS',
        details: 'clinicianId, startDate, and endDate are required for bidirectional sync.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  const { data: connections, error: connectionsError } = await supabaseClient
    .from('nylas_connections')
    .select('*')
    .eq('user_id', clinicianId)
    .eq('is_active', true);

  if (connectionsError) {
    console.error('[syncBidirectional] DB error fetching connections:', connectionsError);
    return new Response(JSON.stringify({ error: 'Failed to fetch connections' }), { status: 500 });
  }

  if (!connections || connections.length === 0) {
    return new Response(JSON.stringify({ success: true, message: "No active connections to sync." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let totalCreatedLocal = 0, totalUpdatedLocal = 0, totalDeletedLocal = 0;
  let totalCreatedRemote = 0;
  const errors: any[] = [];

  for (const rawConnection of (connections as NylasConnection[])) {
    try {
      const connection = await getRefreshedNylasConnection(rawConnection, supabaseClient);
      console.log(`[syncBidirectional] Processing connection ${connection.id} for clinician ${clinicianId}`);
      
      // Step 1: Fetch Remote Events from Nylas
      const eventsUrl = new URL(`https://api.us.nylas.com/v3/grants/${connection.id}/events`);
      eventsUrl.searchParams.set('start', (new Date(startDate).getTime() / 1000).toString());
      eventsUrl.searchParams.set('end', (new Date(endDate).getTime() / 1000).toString());
      
      const eventsResponse = await fetch(eventsUrl.toString(), {
        headers: { 'Authorization': `Bearer ${connection.access_token}` },
      });

      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch Nylas events: ${await eventsResponse.text()}`);
      }
      const { data: nylasEvents } = await eventsResponse.json();
      const nylasEventIds = new Set(nylasEvents.map((e: any) => e.id));
      console.log(`[syncBidirectional] Found ${nylasEvents.length} events in external calendar.`);

      // Step 2: Fetch Local Data
      const { data: existingMappings, error: mappingError } = await supabaseClient
        .from('external_calendar_mappings')
        .select('*, appointments(id, start_at, end_at, notes, status)')
        .eq('connection_id', connection.id);

      if (mappingError) throw mappingError;
      const mappingsByExternalId = new Map(existingMappings.map((m: any) => [m.external_event_id, m]));

      // Step 3: Reconcile Remote -> Local
      for (const event of nylasEvents) {
        const eventHash = createEventHash(event);
        const existingMapping = mappingsByExternalId.get(event.id);

        if (existingMapping) { // Update existing
          if (existingMapping.last_sync_hash !== eventHash) {
            const { error } = await supabaseClient.from('appointments').update({
              start_at: new Date(event.when.start_time * 1000).toISOString(),
              end_at: new Date(event.when.end_time * 1000).toISOString(),
              notes: `(Updated) Synced from ${connection.provider}: ${event.title}`,
            }).eq('id', existingMapping.appointment_id);
            if (error) errors.push({ id: event.id, error: 'Failed to update appointment' });
            else {
              await supabaseClient.from('external_calendar_mappings').update({ last_sync_hash: eventHash }).eq('id', existingMapping.id);
              totalUpdatedLocal++;
            }
          }
        } else { // Create new
          const { data: newAppt, error } = await supabaseClient.from('appointments').insert({
            clinician_id: clinicianId, type: 'External Event', status: 'scheduled',
            start_at: new Date(event.when.start_time * 1000).toISOString(),
            end_at: new Date(event.when.end_time * 1000).toISOString(),
            notes: `Synced from ${connection.provider}: ${event.title}`,
          }).select().single();
          if (error) errors.push({ id: event.id, error: 'Failed to create appointment' });
          else {
            await supabaseClient.from('external_calendar_mappings').insert({
              appointment_id: newAppt.id, external_event_id: event.id, connection_id: connection.id,
              sync_direction: 'inbound', last_sync_hash: eventHash,
            });
            totalCreatedLocal++;
          }
        }
      }
      // Handle deletes
      for (const mapping of existingMappings) {
        if (!mapping.appointments) continue; // Safety check
        const apptDate = new Date(mapping.appointments.start_at);
        const isInRange = apptDate >= new Date(startDate) && apptDate <= new Date(endDate);
        if (isInRange && !nylasEventIds.has(mapping.external_event_id)) {
          const { error } = await supabaseClient.from('appointments').update({ status: 'cancelled', notes: 'Cancelled: Event deleted from external calendar.' }).eq('id', mapping.appointment_id);
          if (error) errors.push({ id: mapping.appointment_id, error: 'Failed to cancel appointment' });
          else {
            await supabaseClient.from('external_calendar_mappings').delete().eq('id', mapping.id);
            totalDeletedLocal++;
          }
        }
      }

      // Step 4: Reconcile Local -> Remote (Creations only)
      const { data: localAppointments, error: localApptError } = await supabaseClient
        .from('appointments')
        .select(`*, external_calendar_mappings(appointment_id)`)
        .eq('clinician_id', clinicianId)
        .is('external_calendar_mappings.appointment_id', null) // only those not yet synced
        .gte('start_at', new Date(startDate).toISOString())
        .lte('start_at', new Date(endDate).toISOString());
      
      if (localApptError) throw localApptError;

      for (const appointment of localAppointments) {
          const eventData = {
              title: `Appointment: ${appointment.type}`,
              description: appointment.notes || '',
              when: {
                  start_time: Math.floor(new Date(appointment.start_at).getTime() / 1000),
                  end_time: Math.floor(new Date(appointment.end_at).getTime() / 1000),
              },
              calendar_id: connection.calendar_ids?.[0] || 'primary',
          };
          const eventResponse = await fetch(`https://api.us.nylas.com/v3/grants/${connection.id}/events`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(eventData),
          });

          if (eventResponse.ok) {
              const eventResult = await eventResponse.json();
              await supabaseClient.from('external_calendar_mappings').insert({
                  appointment_id: appointment.id,
                  external_event_id: eventResult.data.id,
                  connection_id: connection.id,
                  sync_direction: 'outbound',
                  last_sync_hash: createEventHash(eventResult.data),
              });
              totalCreatedRemote++;
          } else {
              errors.push({ id: appointment.id, error: `Failed to create remote event: ${await eventResponse.text()}` });
          }
      }

    } catch (connError) {
      console.error(`[syncBidirectional] Error processing connection ${rawConnection.id}:`, connError)
      errors.push({ connection_id: rawConnection.id, error: connError.message });
    }
  }

  const summary = `Sync complete. Local: ${totalCreatedLocal} created, ${totalUpdatedLocal} updated, ${totalDeletedLocal} deleted. Remote: ${totalCreatedRemote} created.`;
  return new Response(JSON.stringify({ success: true, message: summary, errors: errors.length > 0 ? errors : undefined }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
