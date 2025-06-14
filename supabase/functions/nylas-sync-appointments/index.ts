
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { authorizeRequest } from './auth.ts'
import { handlePing, handleCheckConfig } from './actions/diagnostics.ts'
import { syncAppointmentToCalendar } from './actions/syncToCalendar.ts'
import { syncCalendarToAppointments } from './actions/syncFromCalendar.ts'
import { syncBidirectional } from './actions/syncBidirectional.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { supabaseClient, userId, errorResponse } = await authorizeRequest(req);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'ping':
        return handlePing(userId);

      case 'check-config':
        return handleCheckConfig();

      case 'sync_appointment_to_calendar':
        return await syncAppointmentToCalendar(supabaseClient, body);

      case 'sync_calendar_to_appointments':
        return await syncCalendarToAppointments(supabaseClient, body);

      case 'sync_bidirectional':
        return await syncBidirectional(supabaseClient, body);

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action',
            code: 'INVALID_ACTION',
            details: `Action '${action}' is not supported`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('[nylas-sync-appointments] Top-level error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Server error',
        code: 'SERVER_ERROR',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
