
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createEventHash, NylasConnection } from '../utils.ts'

// Helper to create a standardized object from a local appointment for consistent hashing
function createStandardizedEventObject(appointment: any): any {
  return {
    title: `Appointment: ${appointment.type}`,
    description: appointment.notes || '',
    when: {
      start_time: Math.floor(new Date(appointment.start_at).getTime() / 1000),
      end_time: Math.floor(new Date(appointment.end_at).getTime() / 1000),
    },
  };
}

interface ReconcileResult {
  created: number;
  updated: number;
  deleted: number;
  errors: any[];
}

export async function reconcileLocalToRemote(
  supabaseClient: SupabaseClient, 
  connection: NylasConnection,
  nylasEventIds: Set<string>,
  clinicianId: string,
  startDate: string,
  endDate: string
): Promise<ReconcileResult> {
  const logPrefix = `[Local->Remote][Conn:${connection.id}]`;
  console.log(`${logPrefix} Starting reconciliation.`);
  
  let created = 0, updated = 0, deleted = 0;
  const errors: any[] = [];
  
  const authHeader = { 'Authorization': `Bearer ${connection.access_token}`, 'Content-Type': 'application/json' };

  // Step 1: Handle local UPDATES to be pushed to remote
  const { data: mappedAppointments, error: mappedApptError } = await supabaseClient
    .from('appointments')
    .select(`*, external_calendar_mappings!inner(id, external_event_id, last_sync_hash)`)
    .eq('clinician_id', clinicianId)
    .eq('external_calendar_mappings.connection_id', connection.id)
    .gte('start_at', new Date(startDate).toISOString())
    .lte('start_at', new Date(endDate).toISOString())
    .neq('status', 'cancelled');
  
  if (mappedApptError) {
      console.error(`${logPrefix} Error fetching mapped appointments for update check:`, mappedApptError);
      errors.push({ type: 'local_update_fetch', details: mappedApptError.message });
  } else {
      const updatePromises = mappedAppointments.map(async (appointment) => {
        const mapping = appointment.external_calendar_mappings[0];
        const localAppointmentHash = createEventHash(createStandardizedEventObject(appointment));

        if (mapping.last_sync_hash !== localAppointmentHash && nylasEventIds.has(mapping.external_event_id)) {
            console.log(`${logPrefix} Local change detected for appointment ${appointment.id}. Syncing to remote event ${mapping.external_event_id}.`);
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
                headers: authHeader,
                body: JSON.stringify(eventData),
            });
            if (updateResponse.ok) {
                const updatedEventResult = await updateResponse.json();
                const newHash = createEventHash(updatedEventResult.data);
                await supabaseClient.from('external_calendar_mappings').update({ last_sync_hash: newHash }).eq('id', mapping.id);
                return { status: 'updated' };
            } else {
                return { status: 'error', error: { appointment_id: appointment.id, details: `Failed to update remote event: ${await updateResponse.text()}` } };
            }
        }
        return { status: 'skipped' };
      });
      
      const updateResults = await Promise.all(updatePromises);
      updateResults.forEach(result => {
          if (result.status === 'updated') updated++;
          if (result.status === 'error' && result.error) errors.push(result.error);
      });
  }

  // Step 2: Handle local CANCELLATIONS to be pushed to remote
  const { data: cancelledAppointments, error: cancelledError } = await supabaseClient
    .from('appointments')
    .select(`id, external_calendar_mappings!inner(id, external_event_id)`)
    .eq('clinician_id', clinicianId)
    .eq('status', 'cancelled')
    .eq('external_calendar_mappings.connection_id', connection.id);

  if (cancelledError) {
      console.error(`${logPrefix} Error fetching cancelled appointments:`, cancelledError);
      errors.push({ type: 'local_delete_fetch', details: cancelledError.message });
  } else {
      const deletePromises = cancelledAppointments.map(async (appointment) => {
        const mapping = appointment.external_calendar_mappings[0];
        if (mapping && mapping.external_event_id && nylasEventIds.has(mapping.external_event_id)) {
            console.log(`${logPrefix} Deleting remote event ${mapping.external_event_id} for cancelled appointment ${appointment.id}.`);
            const deleteResponse = await fetch(`https://api.us.nylas.com/v3/grants/${connection.id}/events/${mapping.external_event_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${connection.access_token}` },
            });
            if (deleteResponse.ok || deleteResponse.status === 404) {
                await supabaseClient.from('external_calendar_mappings').delete().eq('id', mapping.id);
                return { status: 'deleted' };
            } else {
                return { status: 'error', error: { appointment_id: appointment.id, details: `Failed to delete remote event: ${await deleteResponse.text()}` } };
            }
        }
        return { status: 'skipped' };
      });
      const deleteResults = await Promise.all(deletePromises);
      deleteResults.forEach(result => {
          if (result.status === 'deleted') deleted++;
          if (result.status === 'error' && result.error) errors.push(result.error);
      });
  }

  // Step 3: Handle local CREATIONS to be pushed to remote
  const { data: localAppointments, error: localApptError } = await supabaseClient
    .from('appointments')
    .select(`*, external_calendar_mappings(appointment_id)`)
    .eq('clinician_id', clinicianId)
    .is('external_calendar_mappings.appointment_id', null)
    .gte('start_at', new Date(startDate).toISOString())
    .lte('start_at', new Date(endDate).toISOString())
    .neq('status', 'cancelled');
  
  if (localApptError) {
    console.error(`${logPrefix} Error fetching new local appointments:`, localApptError);
    errors.push({ type: 'local_create_fetch', details: localApptError.message });
  } else {
    const createPromises = localAppointments.map(async (appointment) => {
      console.log(`${logPrefix} Found new local appointment ${appointment.id}. Creating remote event.`);
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
          headers: authHeader,
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
          return { status: 'created' };
      } else {
          return { status: 'error', error: { id: appointment.id, details: `Failed to create remote event: ${await eventResponse.text()}` } };
      }
    });

    const createResults = await Promise.all(createPromises);
    createResults.forEach(result => {
        if (result.status === 'created') created++;
        if (result.status === 'error' && result.error) errors.push(result.error);
    });
  }
  
  console.log(`${logPrefix} Reconciliation complete. Remote: ${created} created, ${updated} updated, ${deleted} deleted.`);
  if(errors.length > 0) {
    console.warn(`${logPrefix} Reconciliation finished with ${errors.length} errors.`);
  }

  return { created, updated, deleted, errors };
}
