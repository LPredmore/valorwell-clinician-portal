
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SchedulerRequest {
  action: 'create_scheduler' | 'get_scheduler_config' | 'handle_booking'
  clinicianId?: string
  bookingData?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, clinicianId, bookingData }: SchedulerRequest = await req.json()

    const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID')
    const NYLAS_CLIENT_SECRET = Deno.env.get('NYLAS_CLIENT_SECRET')

    if (!NYLAS_CLIENT_ID || !NYLAS_CLIENT_SECRET) {
      throw new Error('Missing Nylas configuration')
    }

    switch (action) {
      case 'create_scheduler': {
        if (!clinicianId) {
          throw new Error('Clinician ID required')
        }

        // Get clinician's calendar connections
        const { data: connections, error: connError } = await supabaseClient
          .from('nylas_connections')
          .select('*')
          .eq('user_id', clinicianId)
          .eq('is_active', true)

        if (connError || !connections?.length) {
          throw new Error('No active calendar connections found for clinician')
        }

        // Get clinician details
        const { data: clinician, error: clinicianError } = await supabaseClient
          .from('clinicians')
          .select('clinician_first_name, clinician_last_name, clinician_email')
          .eq('id', clinicianId)
          .single()

        if (clinicianError || !clinician) {
          throw new Error('Clinician not found')
        }

        // Create Nylas Scheduler configuration
        const schedulerConfig = {
          name: `${clinician.clinician_first_name} ${clinician.clinician_last_name}`,
          slug: `clinician-${clinicianId}`,
          timezone: 'America/New_York', // Default, can be customized
          access_tokens: connections.map(conn => conn.access_token),
          availability: {
            duration_minutes: 60,
            interval_minutes: 15,
            round_robin_event_split: false,
          },
          event_booking: {
            title: 'ValorWell Appointment',
            description: 'Therapy session with {attendee_name}',
            location: 'Video Session',
            conferencing: {
              provider: 'Zoom',
              autocreate: true,
            },
          },
          booking_questions: [
            {
              name: 'attendee_name',
              type: 'text',
              required: true,
              label: 'Full Name',
            },
            {
              name: 'attendee_email',
              type: 'email',
              required: true,
              label: 'Email Address',
            },
            {
              name: 'phone',
              type: 'phone_number',
              required: false,
              label: 'Phone Number',
            },
            {
              name: 'reason',
              type: 'textarea',
              required: false,
              label: 'Reason for visit',
            },
          ],
          appearance: {
            color: '#2563eb',
            company_name: 'ValorWell',
          },
        }

        // Create scheduler via Nylas API
        const createResponse = await fetch('https://api.nylas.com/v3/scheduling/configurations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(schedulerConfig)
        })

        if (!createResponse.ok) {
          const error = await createResponse.text()
          throw new Error(`Failed to create scheduler: ${error}`)
        }

        const schedulerData = await createResponse.json()

        // Store scheduler configuration in database
        const { data: storedConfig, error: storeError } = await supabaseClient
          .from('nylas_scheduler_configs')
          .upsert({
            clinician_id: clinicianId,
            scheduler_id: schedulerData.id,
            public_url: schedulerData.slug ? `https://book.nylas.com/${schedulerData.slug}` : null,
            config_data: schedulerData,
            is_active: true,
          })
          .select()
          .single()

        if (storeError) {
          console.error('Database error storing scheduler config:', storeError)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            scheduler: schedulerData,
            publicUrl: schedulerData.slug ? `https://book.nylas.com/${schedulerData.slug}` : null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_scheduler_config': {
        if (!clinicianId) {
          throw new Error('Clinician ID required')
        }

        // Get stored scheduler configuration
        const { data: config, error: configError } = await supabaseClient
          .from('nylas_scheduler_configs')
          .select('*')
          .eq('clinician_id', clinicianId)
          .eq('is_active', true)
          .single()

        if (configError || !config) {
          throw new Error('No active scheduler found for clinician')
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            config: config.config_data,
            publicUrl: config.public_url
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'handle_booking': {
        // Handle incoming booking webhook from Nylas
        if (!bookingData) {
          throw new Error('Booking data required')
        }

        // Extract booking information
        const { event, attendees } = bookingData
        const attendee = attendees?.[0]

        if (!attendee) {
          throw new Error('No attendee information found')
        }

        // Find the clinician based on the event
        const { data: schedulerConfig, error: configError } = await supabaseClient
          .from('nylas_scheduler_configs')
          .select('clinician_id')
          .eq('scheduler_id', event.calendar_id)
          .single()

        if (configError || !schedulerConfig) {
          throw new Error('Scheduler configuration not found')
        }

        // Create or find client
        let clientId: string
        const { data: existingClient, error: clientError } = await supabaseClient
          .from('clients')
          .select('id')
          .eq('client_email', attendee.email)
          .single()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          // Create new client
          const { data: newClient, error: newClientError } = await supabaseClient
            .from('clients')
            .insert({
              client_first_name: attendee.name?.split(' ')[0] || '',
              client_last_name: attendee.name?.split(' ').slice(1).join(' ') || '',
              client_email: attendee.email,
              client_phone: attendee.phone || null,
              client_status: 'active',
            })
            .select('id')
            .single()

          if (newClientError || !newClient) {
            throw new Error('Failed to create client')
          }

          clientId = newClient.id
        }

        // Create appointment in Supabase
        const { data: appointment, error: aptError } = await supabaseClient
          .from('appointments')
          .insert({
            client_id: clientId,
            clinician_id: schedulerConfig.clinician_id,
            start_at: event.when.start_time,
            end_at: event.when.end_time,
            type: 'appointment',
            status: 'scheduled',
            notes: attendee.reason || 'Booked via online scheduler',
            appointment_timezone: event.when.timezone || 'UTC',
            video_room_url: event.conferencing?.details?.url || null,
          })
          .select()
          .single()

        if (aptError || !appointment) {
          throw new Error('Failed to create appointment')
        }

        // Create mapping between external event and internal appointment
        await supabaseClient
          .from('external_calendar_mappings')
          .insert({
            appointment_id: appointment.id,
            connection_id: null, // This comes from public booking
            external_event_id: event.id,
            external_calendar_id: event.calendar_id,
          })

        return new Response(
          JSON.stringify({ 
            success: true, 
            appointment: appointment
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Scheduler config error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
