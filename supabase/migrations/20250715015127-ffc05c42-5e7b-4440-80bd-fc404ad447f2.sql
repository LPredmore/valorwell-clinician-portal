-- Remove the old daily appointment reminder cron job
SELECT cron.unschedule('daily-appointment-reminders');

-- Verify the cron job was removed
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'daily-appointment-reminders';