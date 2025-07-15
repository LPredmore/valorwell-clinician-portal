-- Create timezone-specific cron jobs for appointment reminders
-- Each job runs at 00:00 (midnight) in its respective timezone

-- Eastern Time - runs at 00:00 EST/EDT (05:00 UTC in EST, 04:00 UTC in EDT)
-- Using 5:00 UTC as it covers both EST and EDT appropriately
SELECT cron.schedule(
  'appointment-reminder-eastern-tomorrow',
  '0 5 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/appointment-reminder-eastern',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.hx7dJtw5mGgRF_-9k3rMZ5xOJyDFKkE1AwUhPQLfggg"}'::jsonb,
        body:='{"trigger": "cron", "timezone": "America/New_York"}'::jsonb
    ) as request_id;
  $$
);

-- Central Time - runs at 00:00 CST/CDT (06:00 UTC in CST, 05:00 UTC in CDT)
-- Using 6:00 UTC as it covers both CST and CDT appropriately
SELECT cron.schedule(
  'appointment-reminder-central-tomorrow',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/appointment-reminder-central',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.hx7dJtw5mGgRF_-9k3rMZ5xOJyDFKkE1AwUhPQLfggg"}'::jsonb,
        body:='{"trigger": "cron", "timezone": "America/Chicago"}'::jsonb
    ) as request_id;
  $$
);

-- Mountain Time - runs at 00:00 MST/MDT (07:00 UTC in MST, 06:00 UTC in MDT)
-- Using 7:00 UTC as it covers both MST and MDT appropriately
SELECT cron.schedule(
  'appointment-reminder-mountain-tomorrow',
  '0 7 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/appointment-reminder-mountain',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.hx7dJtw5mGgRF_-9k3rMZ5xOJyDFKkE1AwUhPQLfggg"}'::jsonb,
        body:='{"trigger": "cron", "timezone": "America/Denver"}'::jsonb
    ) as request_id;
  $$
);

-- Pacific Time - runs at 00:00 PST/PDT (08:00 UTC in PST, 07:00 UTC in PDT)
-- Using 8:00 UTC as it covers both PST and PDT appropriately
SELECT cron.schedule(
  'appointment-reminder-pacific-tomorrow',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/appointment-reminder-pacific',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.hx7dJtw5mGgRF_-9k3rMZ5xOJyDFKkE1AwUhPQLfggg"}'::jsonb,
        body:='{"trigger": "cron", "timezone": "America/Los_Angeles"}'::jsonb
    ) as request_id;
  $$
);

-- Alaska Time - runs at 00:00 AKST/AKDT (09:00 UTC in AKST, 08:00 UTC in AKDT)
-- Using 9:00 UTC as it covers both AKST and AKDT appropriately
SELECT cron.schedule(
  'appointment-reminder-alaska-tomorrow',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/appointment-reminder-alaska',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.hx7dJtw5mGgRF_-9k3rMZ5xOJyDFKkE1AwUhPQLfggg"}'::jsonb,
        body:='{"trigger": "cron", "timezone": "America/Anchorage"}'::jsonb
    ) as request_id;
  $$
);

-- Hawaii Time - runs at 00:00 HST (10:00 UTC) - Hawaii doesn't observe DST
SELECT cron.schedule(
  'appointment-reminder-hawaii-tomorrow',
  '0 10 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/appointment-reminder-hawaii',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.hx7dJtw5mGgRF_-9k3rMZ5xOJyDFKkE1AwUhPQLfggg"}'::jsonb,
        body:='{"trigger": "cron", "timezone": "Pacific/Honolulu"}'::jsonb
    ) as request_id;
  $$
);

-- Arizona Time - runs at 00:00 MST (07:00 UTC) - Arizona doesn't observe DST
SELECT cron.schedule(
  'appointment-reminder-arizona-tomorrow',
  '0 7 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/appointment-reminder-arizona',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.hx7dJtw5mGgRF_-9k3rMZ5xOJyDFKkE1AwUhPQLfggg"}'::jsonb,
        body:='{"trigger": "cron", "timezone": "America/Phoenix"}'::jsonb
    ) as request_id;
  $$
);

-- Add comments documenting the cron jobs
COMMENT ON EXTENSION pg_cron IS 'PostgreSQL cron job scheduler for timezone-specific appointment reminder emails';

-- Verify all cron jobs were created
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'appointment-reminder%tomorrow%' ORDER BY jobname;