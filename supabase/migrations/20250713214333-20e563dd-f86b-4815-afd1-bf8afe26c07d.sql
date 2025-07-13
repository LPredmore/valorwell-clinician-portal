-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the daily appointment reminder cron job
-- This runs every day at 11:00 AM UTC (6:00 AM EST / 7:00 AM EDT)
SELECT cron.schedule(
  'daily-appointment-reminders',
  '0 11 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/appointment-reminder-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.hx7dJtw5mGgRF_-9k3rMZ5xOJyDFKkE1AwUhPQLfggg"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Add a comment documenting the cron job
COMMENT ON EXTENSION pg_cron IS 'PostgreSQL cron job scheduler for automated appointment reminder emails';

-- Verify the cron job was created
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'daily-appointment-reminders';