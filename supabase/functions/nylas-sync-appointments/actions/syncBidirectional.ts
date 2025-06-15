
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getRefreshedNylasConnection, NylasConnection } from '../utils.ts'
import { reconcileRemoteToLocal } from './reconcileRemoteToLocal.ts'
import { reconcileLocalToRemote } from './reconcileLocalToRemote.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function syncBidirectional(supabaseClient: SupabaseClient, body: any): Promise<Response> {
  const { clinicianId, startDate, endDate } = body;
  const logPrefix = `[SyncService][Clinician:${clinicianId}]`;
  console.log(`${logPrefix} Bidirectional sync triggered for period: ${startDate} to ${endDate}`);

  if (!clinicianId || !startDate || !endDate) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing parameters',
        code: 'MISSING_PARAMS',
        details: 'clinicianId, startDate, and endDate are required.'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  // 1. Fetch active connections
  const { data: connections, error: connectionsError } = await supabaseClient
    .from('nylas_connections')
    .select('*')
    .eq('user_id', clinicianId)
    .eq('is_active', true);

  if (connectionsError) {
    console.error(`${logPrefix} DB error fetching connections:`, connectionsError);
    return new Response(JSON.stringify({ error: 'Failed to fetch connections' }), { status: 500 });
  }

  if (!connections || connections.length === 0) {
    console.log(`${logPrefix} No active connections to sync.`);
    return new Response(JSON.stringify({ success: true, message: "No active connections to sync." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  console.log(`${logPrefix} Found ${connections.length} active connections.`);

  // 2. Initialize aggregate statistics and errors
  let totalCreatedLocal = 0, totalUpdatedLocal = 0, totalDeletedLocal = 0;
  let totalCreatedRemote = 0, totalUpdatedRemote = 0, totalDeletedRemote = 0;
  const allErrors: any[] = [];

  // 3. Process each connection sequentially
  for (const rawConnection of (connections as NylasConnection[])) {
    const connLogPrefix = `${logPrefix}[Conn:${rawConnection.id}]`;
    try {
      // 3a. Refresh connection token
      const connection = await getRefreshedNylasConnection(rawConnection, supabaseClient);
      console.log(`${connLogPrefix} Processing connection for ${connection.email}`);
      
      // 3b. Fetch all remote events for the time range
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
      console.log(`${connLogPrefix} Found ${nylasEvents.length} events in external calendar.`);

      // 3c. Sync remote changes to local database
      const remoteToLocalResult = await reconcileRemoteToLocal(supabaseClient, connection, nylasEvents, clinicianId, startDate, endDate);
      totalCreatedLocal += remoteToLocalResult.created;
      totalUpdatedLocal += remoteToLocalResult.updated;
      totalDeletedLocal += remoteToLocalResult.deleted;
      allErrors.push(...remoteToLocalResult.errors.map(e => ({ ...e, connection_id: connection.id, direction: 'remote->local' })));

      // 3d. Sync local changes to remote calendar
      const localToRemoteResult = await reconcileLocalToRemote(supabaseClient, connection, nylasEventIds, clinicianId, startDate, endDate);
      totalCreatedRemote += localToRemoteResult.created;
      totalUpdatedRemote += localToRemoteResult.updated;
      totalDeletedRemote += localToRemoteResult.deleted;
      allErrors.push(...localToRemoteResult.errors.map(e => ({ ...e, connection_id: connection.id, direction: 'local->remote' })));
      
      console.log(`${connLogPrefix} Finished processing connection.`);

    } catch (connError) {
      console.error(`${connLogPrefix} Unrecoverable error processing connection:`, connError)
      allErrors.push({ connection_id: rawConnection.id, error: connError.message, details: 'This connection was skipped.' });
    }
  }

  // 4. Compile and return summary
  const summary = `Sync complete. Local: ${totalCreatedLocal} created, ${totalUpdatedLocal} updated, ${totalDeletedLocal} deleted. Remote: ${totalCreatedRemote} created, ${totalUpdatedRemote} updated, ${totalDeletedRemote} deleted.`;
  console.log(`${logPrefix} ${summary}`);

  if(allErrors.length > 0) {
    console.warn(`${logPrefix} Sync completed with ${allErrors.length} errors. See response for details.`);
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: summary, 
    errors: allErrors.length > 0 ? allErrors : undefined,
    stats: {
      local: { created: totalCreatedLocal, updated: totalUpdatedLocal, deleted: totalDeletedLocal },
      remote: { created: totalCreatedRemote, updated: totalUpdatedRemote, deleted: totalDeletedRemote }
    }
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
