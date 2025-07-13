import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface AppointmentReminder {
  client_id: string;
  client_email: string;
  client_first_name: string;
  client_preferred_name: string;
  client_time_zone: string;
  appointments: Array<{
    start_at: string;
    date_of_session: string;
    clinician_name: string;
    isToday: boolean;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting appointment reminder email process...");

    // Get current date in EST timezone
    const now = new Date();
    const estOffset = -5; // EST is UTC-5, EDT is UTC-4
    const isDST = isDateInDST(now);
    const currentOffset = isDST ? -4 : -5;
    
    const estNow = new Date(now.getTime() + (currentOffset * 60 * 60 * 1000));
    const today = estNow.toISOString().split('T')[0];
    const tomorrow = new Date(estNow.getTime() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    console.log(`Checking appointments for today (${today}) and tomorrow (${tomorrow}) in EST`);

    // Query appointments for today and tomorrow
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        client_id,
        start_at,
        date_of_session,
        clinician_name,
        clients!inner(
          client_email,
          client_first_name,
          client_preferred_name,
          client_time_zone
        )
      `)
      .eq('status', 'scheduled')
      .gte('start_at', `${today}T00:00:00`)
      .lt('start_at', `${new Date(new Date(tomorrow).getTime() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0]}T00:00:00`);

    if (error) {
      console.error("Error fetching appointments:", error);
      throw error;
    }

    if (!appointments || appointments.length === 0) {
      console.log("No appointments found for today or tomorrow");
      return new Response(JSON.stringify({ message: "No appointments to remind about" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${appointments.length} appointments to process`);

    // Group appointments by client
    const clientReminders: Map<string, AppointmentReminder> = new Map();

    appointments.forEach((apt: any) => {
      const clientData = apt.clients;
      if (!clientData?.client_email) {
        console.warn(`Skipping appointment ${apt.client_id} - no email address`);
        return;
      }

      const aptDate = apt.start_at.split('T')[0];
      const isToday = aptDate === today;

      if (!clientReminders.has(apt.client_id)) {
        clientReminders.set(apt.client_id, {
          client_id: apt.client_id,
          client_email: clientData.client_email,
          client_first_name: clientData.client_first_name,
          client_preferred_name: clientData.client_preferred_name,
          client_time_zone: clientData.client_time_zone || "America/New_York",
          appointments: []
        });
      }

      clientReminders.get(apt.client_id)!.appointments.push({
        start_at: apt.start_at,
        date_of_session: apt.date_of_session,
        clinician_name: apt.clinician_name,
        isToday
      });
    });

    console.log(`Sending reminders to ${clientReminders.size} clients`);

    // Send emails for each client
    const emailResults = [];
    for (const [clientId, reminder] of clientReminders) {
      try {
        const emailResult = await sendReminderEmail(reminder);
        emailResults.push({ clientId, success: true, result: emailResult });
        console.log(`Email sent successfully to ${reminder.client_email}`);
      } catch (error) {
        console.error(`Failed to send email to ${reminder.client_email}:`, error);
        emailResults.push({ clientId, success: false, error: error.message });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.filter(r => !r.success).length;

    console.log(`Email sending complete: ${successCount} sent, ${failureCount} failed`);

    return new Response(JSON.stringify({
      message: "Appointment reminders processed",
      stats: {
        total_clients: clientReminders.size,
        emails_sent: successCount,
        emails_failed: failureCount
      },
      results: emailResults
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in appointment reminder function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function sendReminderEmail(reminder: AppointmentReminder): Promise<any> {
  const clientName = reminder.client_preferred_name || reminder.client_first_name || "Patient";
  
  // Separate today's and tomorrow's appointments
  const todayAppointments = reminder.appointments.filter(apt => apt.isToday);
  const tomorrowAppointments = reminder.appointments.filter(apt => !apt.isToday);

  let emailContent = "";
  let subject = "";

  // Handle today's appointments
  if (todayAppointments.length > 0) {
    subject = "Appointment Reminder - Today";
    emailContent += `<p>Hello ${clientName},</p>`;
    
    todayAppointments.forEach(apt => {
      const appointmentTime = formatTimeInClientTimezone(apt.start_at, reminder.client_time_zone);
      const appointmentDate = formatDateForEmail(apt.start_at, reminder.client_time_zone);
      
      emailContent += `<p>You have an appointment today, ${appointmentDate}, at ${appointmentTime}.</p>`;
    });
  }

  // Handle tomorrow's appointments
  if (tomorrowAppointments.length > 0) {
    if (todayAppointments.length > 0) {
      emailContent += "<br>";
    } else {
      subject = "Appointment Reminder - Tomorrow";
      emailContent += `<p>Hello ${clientName},</p>`;
    }
    
    tomorrowAppointments.forEach(apt => {
      const appointmentTime = formatTimeInClientTimezone(apt.start_at, reminder.client_time_zone);
      const appointmentDate = formatDateForEmail(apt.start_at, reminder.client_time_zone);
      
      emailContent += `<p>You have an appointment tomorrow, ${appointmentDate}, at ${appointmentTime}.</p>`;
    });
  }

  // If both today and tomorrow appointments exist, use a combined subject
  if (todayAppointments.length > 0 && tomorrowAppointments.length > 0) {
    subject = "Appointment Reminders - Today & Tomorrow";
  }

  emailContent += `
    <p>Remember to login at <a href="https://client.valorwell.org">client.valorwell.org</a> to join your appointment.</p>
    <p>If you are not able to make your appointment please ensure that you reach out to your therapist as soon as possible to let them know.</p>
    <br>
    <p>Best regards,<br>ValorWell Team</p>
  `;

  return await resend.emails.send({
    from: "ValorWell <appointments@valorwell.org>",
    to: [reminder.client_email],
    subject: subject,
    html: emailContent,
  });
}

function formatTimeInClientTimezone(utcTimeString: string, clientTimezone: string): string {
  try {
    const date = new Date(utcTimeString);
    return date.toLocaleTimeString('en-US', {
      timeZone: clientTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    // Fallback to EST
    const date = new Date(utcTimeString);
    return date.toLocaleTimeString('en-US', {
      timeZone: "America/New_York",
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}

function formatDateForEmail(utcTimeString: string, clientTimezone: string): string {
  try {
    const date = new Date(utcTimeString);
    return date.toLocaleDateString('en-US', {
      timeZone: clientTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    // Fallback to EST
    const date = new Date(utcTimeString);
    return date.toLocaleDateString('en-US', {
      timeZone: "America/New_York",
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

function isDateInDST(date: Date): boolean {
  // DST in US typically runs from second Sunday in March to first Sunday in November
  const year = date.getFullYear();
  
  // Second Sunday in March
  const marchSecondSunday = new Date(year, 2, 8); // March 8th
  marchSecondSunday.setDate(8 + (7 - marchSecondSunday.getDay()) % 7);
  
  // First Sunday in November  
  const novemberFirstSunday = new Date(year, 10, 1); // November 1st
  novemberFirstSunday.setDate(1 + (7 - novemberFirstSunday.getDay()) % 7);
  
  return date >= marchSecondSunday && date < novemberFirstSunday;
}

serve(handler);