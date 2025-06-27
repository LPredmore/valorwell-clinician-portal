-- Check if nylas_connections table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'nylas_connections'
);

-- Check if nylas_scheduler_configs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'nylas_scheduler_configs'
);

-- Check if external_calendar_mappings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'external_calendar_mappings'
);

-- Check if calendar_sync_logs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'calendar_sync_logs'
);

-- Check RLS policies for nylas_connections
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'nylas_connections';

-- Check RLS policies for nylas_scheduler_configs
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'nylas_scheduler_configs';

-- Check RLS policies for external_calendar_mappings
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'external_calendar_mappings';

-- Check RLS policies for calendar_sync_logs
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'calendar_sync_logs';

-- Check if RLS is enabled for these tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('nylas_connections', 'nylas_scheduler_configs', 'external_calendar_mappings', 'calendar_sync_logs');

-- Check permissions granted to authenticated role
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
AND table_name IN ('nylas_connections', 'nylas_scheduler_configs', 'external_calendar_mappings', 'calendar_sync_logs');