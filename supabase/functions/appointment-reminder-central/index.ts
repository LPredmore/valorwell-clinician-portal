import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface AppointmentReminder {
  clientEmail: string;
  clientName: string;
  clientTimezone: string;
  appointments: Array<{
    date: string;
    clinicianName: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Central timezone appointment reminder function');
    
    // Calculate 24-48 hour window for America/Chicago timezone
    const now = new Date();
    const centralNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    const start24Hours = new Date(centralNow);
    start24Hours.setDate(start24Hours.getDate() + 1);
    start24Hours.setHours(0, 0, 0, 0);
    
    const end48Hours = new Date(centralNow);
    end48Hours.setDate(end48Hours.getDate() + 2);
    end48Hours.setHours(23, 59, 59, 999);

    console.log(`Searching for appointments between ${start24Hours.toISOString()} and ${end48Hours.toISOString()} for Central timezone`);

    // Query appointments for Central timezone clients in the next 24-48 hours
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_at,
        client_id,
        client_name,
        client_email,
        client_timezone,
        clinician_name,
        status
      `)
      .eq('client_timezone', 'America/Chicago')
      .gte('start_at', start24Hours.toISOString())
      .lte('start_at', end48Hours.toISOString())
      .in('status', ['scheduled', 'confirmed'])
      .not('client_email', 'is', null);

    if (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }

    console.log(`Found ${appointments?.length || 0} appointments for Central timezone`);

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: 'No appointments found for Central timezone' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group appointments by client
    const clientGroups = new Map<string, AppointmentReminder>();
    
    for (const appointment of appointments) {
      const clientKey = appointment.client_email;
      
      if (!clientGroups.has(clientKey)) {
        clientGroups.set(clientKey, {
          clientEmail: appointment.client_email,
          clientName: appointment.client_name || 'Valued Client',
          clientTimezone: appointment.client_timezone,
          appointments: []
        });
      }
      
      const group = clientGroups.get(clientKey)!;
      group.appointments.push({
        date: formatDateForEmail(appointment.start_at, appointment.client_timezone),
        clinicianName: appointment.clinician_name || 'Your clinician'
      });
    }

    // Send emails
    const emailResults = [];
    for (const reminder of clientGroups.values()) {
      try {
        const result = await sendReminderEmail(reminder);
        emailResults.push({ success: true, client: reminder.clientEmail, result });
        console.log(`Email sent successfully to ${reminder.clientEmail}`);
      } catch (error) {
        console.error(`Failed to send email to ${reminder.clientEmail}:`, error);
        emailResults.push({ success: false, client: reminder.clientEmail, error: error.message });
      }
    }

    return new Response(JSON.stringify({
      message: `Processed ${appointments.length} appointments for ${clientGroups.size} clients in Central timezone`,
      results: emailResults
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Central timezone reminder function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

async function sendReminderEmail(reminder: AppointmentReminder) {
  const appointmentsList = reminder.appointments.map(apt => 
    `• ${apt.date} with ${apt.clinicianName}`
  ).join('\n');

  const emailHtml = `
    <h2>Appointment Reminder - Tomorrow</h2>
    <p>Dear ${reminder.clientName},</p>
    <p>This is a friendly reminder that you have the following appointment(s) scheduled for tomorrow:</p>
    <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
      ${reminder.appointments.map(apt => `
        <p style="margin: 5px 0;"><strong>${apt.date}</strong> with ${apt.clinicianName}</p>
      `).join('')}
    </div>
    <p>Please make sure to join your session on time. If you need to reschedule or have any questions, please contact us as soon as possible.</p>
    <p>Best regards,<br>Your Healthcare Team</p>
  `;

  return await resend.emails.send({
    from: 'Healthcare Team <noreply@yourdomain.com>',
    to: [reminder.clientEmail],
    subject: 'Appointment Reminder - Tomorrow',
    html: emailHtml,
  });
}

function formatDateForEmail(utcTimeString: string, clientTimezone: string): string {
  const date = new Date(utcTimeString);
  return date.toLocaleDateString('en-US', {
    timeZone: clientTimezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

serve(handler);