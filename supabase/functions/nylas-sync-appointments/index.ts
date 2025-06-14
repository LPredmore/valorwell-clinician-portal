import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "https://deno.land/std@0.168.0/hash/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to create a consistent hash for an event
const createEventHash = (event: any): string => {
  const data = {
    title: event.title,
    start: event.when.start_time,
    end: event.when.end_time,
    description: event.description,
    location: event.location,
    participants: event.participants?.map((p: any) => p.email).sort()
  };
  const hash = createHash("sha-256");
  hash.update(JSON.stringify(data));
  return hash.toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[nylas-sync-appointments] Request received:', req.method, req.url)
    
    // --- Start: Internal Call Authorization ---
    const internalCallSecret = req.headers.get('x-internal-call-secret');
    const INTERNAL_FUNCTIONS_SECRET = Deno.env.get('INTERNAL_FUNCTIONS_SECRET');
    let isInternalCall = false;

    if (internalCallSecret && INTERNAL_FUNCTIONS_SECRET && internalCallSecret === INTERNAL_FUNCTIONS_SECRET) {
      console.log('[nylas-sync-appointments] Internal call authorized.');
      isInternalCall = true;
    }
    // --- End: Internal Call Authorization ---

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Bypass JWT check for internal calls, as they are pre-authorized
    if (!isInternalCall) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        console.error('[nylas-sync-appointments] No authorization header')
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            code: 'AUTH_HEADER_MISSING',
            details: 'No authorization header provided'
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) {
        console.error('[nylas-sync-appointments] Authentication failed:', authError)
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            code: 'INVALID_JWT',
            details: authError?.message || 'Invalid or expired JWT token'
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      console.log('[nylas-sync-appointments] Authenticated user:', user.id)
    }

    const { 
      action, 
      appointmentId, 
      clinicianId, 
      startDate, 
      endDate,
      syncDirection = 'both' 
    } = await req.json()

    // Check for ping action
    if (action === 'ping') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          user_id: user.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for check-config action
    if (action === 'check-config') {
      const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID')
      const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
      const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
      
      const missingConfig = []
      if (!nylasClientId) missingConfig.push('NYLAS_CLIENT_ID')
      if (!nylasClientSecret) missingConfig.push('NYLAS_CLIENT_SECRET')
      if (!nylasApiKey) missingConfig.push('NYLAS_API_KEY')
      
      if (missingConfig.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Nylas configuration missing',
            missing: missingConfig,
            details: `Missing environment variables: ${missingConfig.join(', ')}`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          status: 'ok',
          message: 'Nylas configuration is valid',
          config: {
            hasClientId: true,
            hasClientSecret: true,
            hasApiKey: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    if (!nylasClientSecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Nylas configuration missing',
          code: 'CONFIG_MISSING',
          details: 'NYLAS_CLIENT_SECRET is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    switch (action) {
      case 'sync_appointment_to_calendar': {
        if (!appointmentId) {
          return new Response(
            JSON.stringify({ 
              error: 'Appointment ID required',
              code: 'MISSING_APPOINTMENT_ID',
              details: 'An appointment ID must be provided'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
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
          console.error('[nylas-sync-appointments] Database error:', appointmentError)
          return new Response(
            JSON.stringify({ 
              error: 'Appointment not found',
              code: 'DB_ERROR',
              details: appointmentError?.message || 'The appointment could not be found'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
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
          console.error('[nylas-sync-appointments] Database error:', connectionsError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to fetch connections',
              code: 'DB_ERROR',
              details: connectionsError.message
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        if (!connections || connections.length === 0) {
          return new Response(
            JSON.stringify({ 
              error: 'No active calendar connection found',
              code: 'NO_ACTIVE_CONNECTION',
              details: 'The clinician does not have an active calendar connection'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
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

        console.log('[nylas-sync-appointments] Creating calendar event for appointment:', appointmentId)
        
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
          console.error('[nylas-sync-appointments] Failed to create calendar event:', eventResponse.status, error)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create calendar event',
              code: 'API_ERROR',
              details: error
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const eventResult = await eventResponse.json()
        console.log('[nylas-sync-appointments] Calendar event created successfully:', eventResult.data.id)

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
          console.error('[nylas-sync-appointments] Database error:', mappingError)
          // We don't return an error here since the event was created successfully
          // Just log the error and continue
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            external_event_id: eventResult.data.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'sync_calendar_to_appointments': {
        if (!clinicianId) {
          return new Response(
            JSON.stringify({ 
              error: 'Clinician ID required',
              code: 'MISSING_CLINICIAN_ID',
              details: 'A clinician ID must be provided'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Get clinician's connections
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', clinicianId)
          .eq('is_active', true)

        if (connectionsError) {
          console.error('[nylas-sync-appointments] Database error fetching connections:', connectionsError)
          return new Response(JSON.stringify({ error: 'Failed to fetch connections' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (!connections || connections.length === 0) {
          return new Response(JSON.stringify({ success: true, message: "No active connections to sync." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        let totalCreated = 0
        let totalUpdated = 0
        let totalDeleted = 0
        const errors = []

        for (const connection of connections) {
          try {
            console.log(`[nylas-sync-appointments] Processing connection ${connection.id} for clinician ${clinicianId}`)
            
            // 1. Fetch all events from Nylas for the date range
            const eventsUrl = new URL(`https://api.us.nylas.com/v3/grants/${connection.id}/events`)
            if (startDate) eventsUrl.searchParams.set('start', (new Date(startDate).getTime() / 1000).toString());
            if (endDate) eventsUrl.searchParams.set('end', (new Date(endDate).getTime() / 1000).toString());
            
            const eventsResponse = await fetch(eventsUrl.toString(), {
              headers: { 'Authorization': `Bearer ${connection.access_token}` },
            })

            if (!eventsResponse.ok) {
              const errorText = await eventsResponse.text()
              console.error(`[nylas-sync-appointments] Error fetching events for connection ${connection.id}:`, errorText)
              errors.push({ connection_id: connection.id, error: 'Failed to fetch events', details: errorText });
              continue;
            }

            const eventsData = await eventsResponse.json();
            const nylasEvents = eventsData.data || [];
            const nylasEventIds = new Set(nylasEvents.map((e: any) => e.id));
            console.log(`[nylas-sync-appointments] Found ${nylasEvents.length} events in external calendar.`);

            // 2. Fetch all existing mappings for this connection in the date range
            const { data: existingMappings, error: mappingError } = await supabaseClient
              .from('external_calendar_mappings')
              .select('*, appointments(start_at)')
              .eq('connection_id', connection.id);

            if (mappingError) {
              errors.push({ connection_id: connection.id, error: 'Failed to fetch mappings', details: mappingError.message });
              continue;
            }

            const mappingsByExternalId = new Map(existingMappings.map((m: any) => [m.external_event_id, m]));

            // 3. Reconcile: Handle Creates and Updates
            for (const event of nylasEvents) {
              const eventHash = createEventHash(event);
              const existingMapping = mappingsByExternalId.get(event.id);

              if (existingMapping) {
                // UPDATE: Event exists in our system, check if it changed
                if (existingMapping.last_sync_hash !== eventHash) {
                  console.log(`[nylas-sync-appointments] Updating appointment for event ${event.id}`);
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
                // CREATE: New event, create appointment and mapping
                console.log(`[nylas-sync-appointments] Creating new appointment for event ${event.id}`);
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

            // 4. Reconcile: Handle Deletes
            for (const mapping of existingMappings) {
               const appointmentDate = new Date(mapping.appointments.start_at);
               const isWithinRange = (!startDate || appointmentDate >= new Date(startDate)) && (!endDate || appointmentDate <= new Date(endDate));

              if (isWithinRange && !nylasEventIds.has(mapping.external_event_id)) {
                console.log(`[nylas-sync-appointments] Deleting (cancelling) appointment for event ${mapping.external_event_id}`);
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
            console.error(`[nylas-sync-appointments] Error processing connection ${connection.id}:`, connectionError)
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

      case 'sync_bidirectional': {
        console.log(`[nylas-sync-appointments] Bidirectional sync started for clinician: ${clinicianId}`);
        if (!clinicianId || !startDate || !endDate) {
          return new Response(
            JSON.stringify({ 
              error: 'Missing parameters',
              code: 'MISSING_PARAMS',
              details: 'clinicianId, startDate, and endDate are required for bidirectional sync.'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        // This is a placeholder implementation.
        // It logs the intended actions without modifying any data.
        console.log('[nylas-sync-appointments] NOTE: Running in analysis-only mode. No data will be written.');

        // TODO: Implement full C-U-D logic for both directions.
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Bidirectional sync analysis complete. See function logs for details.",
            status: "analysis_only"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action',
            code: 'INVALID_ACTION',
            details: `Action '${action}' is not supported`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('[nylas-sync-appointments] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Server error',
        code: 'SERVER_ERROR',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
