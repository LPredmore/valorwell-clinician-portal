import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createEventHash, getRefreshedNylasConnection, NylasConnection } from '../utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to create a standardized object from a local appointment for consistent hashing
function createStandardizedEventObject(appointment: any): any {
  return {
    title: `Appointment: ${appointment.type}`,
    description: appointment.notes || '',
    when: {
      start_time: Math.floor(new Date(appointment.start_at).getTime() / 1000),
      end_time: Math.floor(new Date(appointment.end_at).getTime() / 1000),
    },
    // We don't include participants here for hash comparison to avoid mismatches
    // based on data not stored locally or differences in participant lists.
  };
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
  let totalCreatedRemote = 0, totalUpdatedRemote = 0, totalDeletedRemote = 0;
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

      // Step 4: Reconcile Local -> Remote
      
      // Step 4a: Handle local UPDATES to be pushed to remote
      const { data: mappedAppointments, error: mappedApptError } = await supabaseClient
        .from('appointments')
        .select(`*, external_calendar_mappings!inner(id, external_event_id, last_sync_hash)`)
        .eq('clinician_id', clinicianId)
        .eq('external_calendar_mappings.connection_id', connection.id)
        .gte('start_at', new Date(startDate).toISOString())
        .lte('start_at', new Date(endDate).toISOString())
        .neq('status', 'cancelled');

      if (mappedApptError) {
          console.error(`[syncBidirectional] Error fetching mapped appointments for update check:`, mappedApptError);
          errors.push({ type: 'local_update_fetch', error: mappedApptError.message });
      } else {
          for (const appointment of mappedAppointments) {
              const mapping = appointment.external_calendar_mappings[0];
              const standardObject = createStandardizedEventObject(appointment);
              const localAppointmentHash = createEventHash(standardObject);

              if (mapping.last_sync_hash !== localAppointmentHash && nylasEventIds.has(mapping.external_event_id)) {
                  console.log(`[syncBidirectional] Local changes detected for appointment ${appointment.id}. Syncing to remote.`);
                  
                  const eventData = {
                      title: `Appointment: ${appointment.type}`,
                      description: appointment.notes || '',
                      when: {
                          start_time: Math.floor(new Date(appointment.start_at).getTime() / 1000),
                          end_time: Math.floor(new Date(appointment.end_at).getTime() / 1000),
                      },
                  };

                  const updateResponse = await fetch(`https://api.us.nylas.com/v3/grants/${connection.id}/events/${mapping.external_event_id}`, {
                      method: 'PUT',
                      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify(eventData),
                  });

                  if (updateResponse.ok) {
                      const updatedEventResult = await updateResponse.json();
                      const newHash = createEventHash(updatedEventResult.data);
                      await supabaseClient.from('external_calendar_mappings').update({ last_sync_hash: newHash }).eq('id', mapping.id);
                      totalUpdatedRemote++;
                  } else {
                      const errorText = await updateResponse.text();
                      errors.push({ appointment_id: appointment.id, error: `Failed to update remote event: ${errorText}` });
                  }
              }
          }
      }

      // Step 4b: Handle local cancellations to be pushed to remote
      const { data: cancelledAppointments, error: cancelledError } = await supabaseClient
        .from('appointments')
        .select(`id, external_calendar_mappings!inner(id, external_event_id)`)
        .eq('clinician_id', clinicianId)
        .eq('status', 'cancelled')
        .eq('external_calendar_mappings.connection_id', connection.id);

      if (cancelledError) {
          console.error(`[syncBidirectional] Error fetching cancelled appointments:`, cancelledError);
          errors.push({ type: 'local_delete_fetch', error: cancelledError.message });
      } else {
          for (const appointment of cancelledAppointments) {
              const mapping = appointment.external_calendar_mappings[0];
              if (mapping && mapping.external_event_id) {
                  console.log(`[syncBidirectional] Deleting remote event ${mapping.external_event_id} for cancelled appointment ${appointment.id}`);
                  
                  const deleteResponse = await fetch(`https://api.us.nylas.com/v3/grants/${connection.id}/events/${mapping.external_event_id}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${connection.access_token}` },
                  });

                  // If OK, or if it was already gone, we can delete our mapping
                  if (deleteResponse.ok || deleteResponse.status === 404) {
                      const { error: deleteMappingError } = await supabaseClient
                          .from('external_calendar_mappings')
                          .delete()
                          .eq('id', mapping.id);
                      
                      if (deleteMappingError) {
                          errors.push({ appointment_id: appointment.id, error: `Failed to delete local mapping: ${deleteMappingError.message}` });
                      } else {
                          totalDeletedRemote++;
                      }
                  } else {
                      const errorText = await deleteResponse.text();
                      errors.push({ appointment_id: appointment.id, error: `Failed to delete remote event: ${errorText}` });
                  }
              }
          }
      }

      // Step 4c: Handle local creations to be pushed to remote
      const { data: localAppointments, error: localApptError } = await supabaseClient
        .from('appointments')
        .select(`*, external_calendar_mappings(appointment_id)`)
        .eq('clinician_id', clinicianId)
        .is('external_calendar_mappings.appointment_id', null) // only those not yet synced
        .gte('start_at', new Date(startDate).toISOString())
        .lte('start_at', new Date(endDate).toISOString())
        .neq('status', 'cancelled'); // Don't sync new cancelled appointments
      
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

  const summary = `Sync complete. Local: ${totalCreatedLocal} created, ${totalUpdatedLocal} updated, ${totalDeletedLocal} deleted. Remote: ${totalCreatedRemote} created, ${totalUpdatedRemote} updated, ${totalDeletedRemote} deleted.`;
  return new Response(JSON.stringify({ success: true, message: summary, errors: errors.length > 0 ? errors : undefined }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
