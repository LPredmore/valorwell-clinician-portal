
-- Phase 2 Migration: Remove Fake Client Dependencies
-- Execute as a single transaction for safety
BEGIN;

-- 1. Create a backup of current blocked time appointments
CREATE TEMP TABLE blocked_time_backup AS
SELECT * FROM appointments 
WHERE client_id = '00000000-0000-0000-0000-000000000001'
   OR type = 'INTERNAL_BLOCKED_TIME';

-- 2. Update all fake client blocked time to use INTERNAL_BLOCKED_TIME type
UPDATE appointments 
SET 
  type = 'INTERNAL_BLOCKED_TIME',
  status = 'hidden',
  notes = COALESCE(notes, 'Migrated blocked time slot')
WHERE client_id = '00000000-0000-0000-0000-000000000001'
  AND type != 'INTERNAL_BLOCKED_TIME';

-- 3. Log migration results
INSERT INTO migration_logs (
  migration_name,
  description,
  details
) VALUES (
  'phase2_blocked_time_migration',
  'Migrated fake client blocked time to INTERNAL_BLOCKED_TIME',
  jsonb_build_object(
    'migrated_count', (
      SELECT COUNT(*) FROM blocked_time_backup 
      WHERE client_id = '00000000-0000-0000-0000-000000000001'
    ),
    'backup_created', true,
    'transaction_safe', true
  )
);

-- 4. Verify migration integrity
DO $$
DECLARE
  fake_client_count INTEGER;
  internal_blocked_count INTEGER;
BEGIN
  -- Count remaining fake client appointments
  SELECT COUNT(*) INTO fake_client_count
  FROM appointments 
  WHERE client_id = '00000000-0000-0000-0000-000000000001';
  
  -- Count INTERNAL_BLOCKED_TIME appointments
  SELECT COUNT(*) INTO internal_blocked_count
  FROM appointments 
  WHERE type = 'INTERNAL_BLOCKED_TIME';
  
  -- Log verification results
  INSERT INTO migration_logs (
    migration_name,
    description,
    details
  ) VALUES (
    'phase2_migration_verification',
    'Migration integrity check completed',
    jsonb_build_object(
      'remaining_fake_client_appointments', fake_client_count,
      'internal_blocked_appointments', internal_blocked_count,
      'migration_timestamp', NOW()
    )
  );
  
  -- Raise notice if any fake client appointments remain
  IF fake_client_count > 0 THEN
    RAISE NOTICE 'WARNING: % fake client appointments still exist', fake_client_count;
  END IF;
END $$;

-- 5. Create monitoring function for ongoing leak detection
CREATE OR REPLACE FUNCTION check_blocked_time_integrity()
RETURNS TABLE(
  check_type TEXT,
  status TEXT,
  count INTEGER,
  message TEXT
) AS $$
BEGIN
  -- Check for fake client leakage
  RETURN QUERY
  SELECT 
    'fake_client_leak'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) = 0 
      THEN 'No fake client appointments detected'
      ELSE 'ALERT: Fake client appointments found'
    END::TEXT
  FROM appointments 
  WHERE client_id = '00000000-0000-0000-0000-000000000001';
  
  -- Check INTERNAL_BLOCKED_TIME integrity
  RETURN QUERY
  SELECT 
    'internal_blocked_integrity'::TEXT,
    'INFO'::TEXT,
    COUNT(*)::INTEGER,
    ('Total INTERNAL_BLOCKED_TIME appointments: ' || COUNT(*))::TEXT
  FROM appointments 
  WHERE type = 'INTERNAL_BLOCKED_TIME';
  
  -- Check for proper stealth status
  RETURN QUERY
  SELECT 
    'stealth_status_check'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) = 0 
      THEN 'All INTERNAL_BLOCKED_TIME appointments properly hidden'
      ELSE 'Some INTERNAL_BLOCKED_TIME appointments may be visible'
    END::TEXT
  FROM appointments 
  WHERE type = 'INTERNAL_BLOCKED_TIME' AND status != 'hidden';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_blocked_time_integrity() TO authenticated;

COMMIT;
