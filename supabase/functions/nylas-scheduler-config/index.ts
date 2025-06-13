import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[nylas-scheduler-config] Request received:', req.method, req.url)
    
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
    if (!authHeader) {
      console.error('[nylas-scheduler-config] No authorization header')
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
      console.error('[nylas-scheduler-config] Authentication failed:', authError)
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

    console.log('[nylas-scheduler-config] Authenticated user:', user.id)

    const { action, clinicianId, schedulerData } = await req.json()

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
      case 'create_scheduler': {
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

        // Get clinician's first active connection
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', clinicianId)
          .eq('is_active', true)
          .limit(1)

        if (connectionsError) {
          console.error('[nylas-scheduler-config] Database error:', connectionsError)
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
              details: 'Please connect a calendar first'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const connection = connections[0]

        // Get clinician details
        const { data: clinician, error: clinicianError } = await supabaseClient
          .from('clinicians')
          .select('clinician_first_name, clinician_last_name, clinician_email')
          .eq('id', clinicianId)
          .single()

        if (clinicianError) {
          console.error('[nylas-scheduler-config] Database error:', clinicianError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to fetch clinician details',
              code: 'DB_ERROR',
              details: clinicianError.message
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Create scheduler configuration via Nylas API
        const schedulerConfig = {
          name: `${clinician.clinician_first_name} ${clinician.clinician_last_name} - Booking`,
          slug: `${clinician.clinician_first_name?.toLowerCase()}-${clinician.clinician_last_name?.toLowerCase()}-${Date.now()}`,
          access_tokens: [connection.access_token],
          event_title: 'Appointment with {{invitee_name}}',
          event_description: 'Scheduled appointment',
          timezone: 'America/New_York',
          appearance: {
            color: '#4F46E5',
            show_nylas_branding: false,
          },
          booking_type: 'collective',
          participants: [{
            name: `${clinician.clinician_first_name} ${clinician.clinician_last_name}`,
            email: clinician.clinician_email || connection.email,
            is_organizer: true,
            availability: {
              calendar_ids: [connection.calendar_ids?.[0] || connection.id],
            },
          }],
          availability: {
            duration_minutes: 50,
            interval_minutes: 15,
            time_slots: [{
              start_time: '09:00',
              end_time: '17:00',
              days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            }],
          },
          booking_questions: [
            {
              name: 'reason',
              title: 'What would you like to discuss?',
              type: 'text',
              required: false,
            },
          ],
        }

        console.log('[nylas-scheduler-config] Creating scheduler configuration')
        
        const schedulerResponse = await fetch('https://api.us.nylas.com/v3/scheduling/configurations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nylasClientSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(schedulerConfig),
        })

        if (!schedulerResponse.ok) {
          const error = await schedulerResponse.text()
          console.error('[nylas-scheduler-config] Failed to create scheduler:', schedulerResponse.status, error)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create scheduler',
              code: 'API_ERROR',
              details: error
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const schedulerResponseData = await schedulerResponse.json()
        console.log('[nylas-scheduler-config] Scheduler created successfully:', schedulerResponseData.id)

        // Store scheduler configuration in database
        const { data: dbScheduler, error: dbError } = await supabaseClient
          .from('nylas_scheduler_configs')
          .insert({
            clinician_id: clinicianId,
            scheduler_id: schedulerResponseData.id,
            public_url: `https://book.nylas.com/${schedulerResponseData.slug}`,
            config_data: schedulerResponseData,
            is_active: true,
          })
          .select()
          .single()

        if (dbError) {
          console.error('[nylas-scheduler-config] Database error:', dbError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to store scheduler configuration',
              code: 'DB_ERROR',
              details: dbError.message
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            scheduler: {
              id: dbScheduler.id,
              scheduler_id: dbScheduler.scheduler_id,
              public_url: dbScheduler.public_url,
              is_active: dbScheduler.is_active,
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_scheduler': {
        // Implementation for updating scheduler settings
        return new Response(
          JSON.stringify({ 
            error: 'Not implemented',
            code: 'NOT_IMPLEMENTED',
            details: 'Update scheduler functionality is not yet implemented'
          }),
          { 
            status: 501,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      case 'delete_scheduler': {
        // Implementation for deleting scheduler
        return new Response(
          JSON.stringify({ 
            error: 'Not implemented',
            code: 'NOT_IMPLEMENTED',
            details: 'Delete scheduler functionality is not yet implemented'
          }),
          { 
            status: 501,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
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
    console.error('[nylas-scheduler-config] Error:', error)
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
