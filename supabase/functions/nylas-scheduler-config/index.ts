
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
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    const { action, clinicianId, schedulerData } = await req.json()

    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    if (!nylasClientSecret) {
      throw new Error('Nylas configuration missing')
    }

    switch (action) {
      case 'create_scheduler': {
        if (!clinicianId) {
          throw new Error('Clinician ID required')
        }

        // Get clinician's first active connection
        const { data: connections, error: connectionsError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', clinicianId)
          .eq('is_active', true)
          .limit(1)

        if (connectionsError || !connections || connections.length === 0) {
          throw new Error('No active calendar connection found. Please connect a calendar first.')
        }

        const connection = connections[0]

        // Get clinician details
        const { data: clinician, error: clinicianError } = await supabaseClient
          .from('clinicians')
          .select('clinician_first_name, clinician_last_name, clinician_email')
          .eq('id', clinicianId)
          .single()

        if (clinicianError) {
          throw new Error('Failed to fetch clinician details')
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

        const schedulerResponse = await fetch('https://api.nylas.com/v3/scheduling/configurations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nylasClientSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(schedulerConfig),
        })

        if (!schedulerResponse.ok) {
          const error = await schedulerResponse.text()
          throw new Error(`Failed to create scheduler: ${error}`)
        }

        const schedulerData = await schedulerResponse.json()

        // Store scheduler configuration in database
        const { data: dbScheduler, error: dbError } = await supabaseClient
          .from('nylas_scheduler_configs')
          .insert({
            clinician_id: clinicianId,
            scheduler_id: schedulerData.id,
            public_url: `https://book.nylas.com/${schedulerData.slug}`,
            config_data: schedulerData,
            is_active: true,
          })
          .select()
          .single()

        if (dbError) {
          console.error('Database error:', dbError)
          throw new Error('Failed to store scheduler configuration')
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
        throw new Error('Update scheduler not yet implemented')
      }

      case 'delete_scheduler': {
        // Implementation for deleting scheduler
        throw new Error('Delete scheduler not yet implemented')
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Nylas scheduler error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
