
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createEventHash, NylasConnection } from '../utils.ts'

interface ReconcileResult {
  created: number;
  updated: number;
  deleted: number;
  errors: any[];
}

export async function reconcileRemoteToLocal(
  supabaseClient: SupabaseClient, 
  connection: NylasConnection, 
  nylasEvents: any[], 
  clinicianId: string,
  startDate: string,
  endDate: string
): Promise<ReconcileResult> {
  const logPrefix = `[Remote->Local][Conn:${connection.id}]`;
  console.log(`${logPrefix} Starting reconciliation for ${nylasEvents.length} remote events.`);
  
  let created = 0, updated = 0, deleted = 0;
  const errors: any[] = [];

  // Step 1: Fetch all local mappings for this connection
  const { data: existingMappings, error: mappingError } = await supabaseClient
    .from('external_calendar_mappings')
    .select('*, appointments(id, start_at, end_at, notes, status)')
    .eq('connection_id', connection.id);

  if (mappingError) {
    console.error(`${logPrefix} DB error fetching mappings:`, mappingError);
    errors.push({ type: 'db_fetch_mappings', details: mappingError.message });
    // Returning immediately as we can't proceed without mappings
    return { created, updated, deleted, errors };
  }
  
  const mappingsByExternalId = new Map(existingMappings.map((m: any) => [m.external_event_id, m]));
  const nylasEventIds = new Set(nylasEvents.map((e: any) => e.id));
  console.log(`${logPrefix} Found ${existingMappings.length} existing mappings.`);

  // Step 2: Reconcile remote events (Creations and Updates)
  for (const event of nylasEvents) {
    const eventHash = createEventHash(event);
    const existingMapping = mappingsByExternalId.get(event.id);

    if (existingMapping) { // Potentially an UPDATE
      if (existingMapping.last_sync_hash !== eventHash) {
        console.log(`${logPrefix} Remote change detected for event ${event.id}. Syncing to local appointment ${existingMapping.appointment_id}.`);
        const { error } = await supabaseClient.rpc('update_appointment_and_mapping', {
            p_appointment_id: existingMapping.appointment_id,
            p_start_at: new Date(event.when.start_time * 1000).toISOString(),
            p_end_at: new Date(event.when.end_time * 1000).toISOString(),
            p_notes: `(Updated) Synced from ${connection.provider}: ${event.title}`,
            p_mapping_id: existingMapping.id,
            p_last_sync_hash: eventHash
        });

        if (error) {
          console.error(`${logPrefix} Transactional update failed for event ${event.id}:`, error);
          errors.push({ id: event.id, error: 'Failed to update appointment', details: error.message });
        } else {
          console.log(`${logPrefix} Successfully updated local appointment ${existingMapping.appointment_id}.`);
          updated++;
        }
      }
    } else { // A new event, needs to be CREATED locally
      console.log(`${logPrefix} New remote event ${event.id} found. Creating local appointment.`);
      const { error } = await supabaseClient.rpc('create_appointment_and_mapping', {
        p_clinician_id: clinicianId,
        p_type: 'External Event',
        p_status: 'scheduled',
        p_start_at: new Date(event.when.start_time * 1000).toISOString(),
        p_end_at: new Date(event.when.end_time * 1000).toISOString(),
        p_notes: `Synced from ${connection.provider}: ${event.title}`,
        p_external_event_id: event.id,
        p_connection_id: connection.id,
        p_sync_direction: 'inbound',
        p_last_sync_hash: eventHash
      });
      
      if (error) {
        console.error(`${logPrefix} Transactional creation failed for event ${event.id}:`, error);
        errors.push({ id: event.id, error: 'Failed to create appointment', details: error.message });
      } else {
        console.log(`${logPrefix} Successfully created local appointment for remote event ${event.id}.`);
        created++;
      }
    }
  }

  // Step 3: Handle remote DELETES
  for (const mapping of existingMappings) {
    if (!mapping.appointments) continue; // Safety check for orphaned mappings
    const apptDate = new Date(mapping.appointments.start_at);
    const isInRange = apptDate >= new Date(startDate) && apptDate <= new Date(endDate);
    
    if (isInRange && !nylasEventIds.has(mapping.external_event_id)) {
      console.log(`${logPrefix} Remote event ${mapping.external_event_id} appears deleted. Cancelling local appointment ${mapping.appointment_id}.`);
      const { error } = await supabaseClient.rpc('cancel_appointment_and_delete_mapping', {
        p_appointment_id: mapping.appointment_id,
        p_mapping_id: mapping.id,
        p_notes: 'Cancelled: Event deleted from external calendar.'
      });

      if (error) {
        console.error(`${logPrefix} Transactional cancellation failed for appointment ${mapping.appointment_id}:`, error);
        errors.push({ id: mapping.appointment_id, error: 'Failed to cancel appointment', details: error.message });
      } else {
        console.log(`${logPrefix} Successfully cancelled local appointment ${mapping.appointment_id}.`);
        deleted++;
      }
    }
  }
  
  console.log(`${logPrefix} Reconciliation complete. Local: ${created} created, ${updated} updated, ${deleted} deleted.`);
  if(errors.length > 0) {
    console.warn(`${logPrefix} Reconciliation finished with ${errors.length} errors.`);
  }

  return { created, updated, deleted, errors };
}
