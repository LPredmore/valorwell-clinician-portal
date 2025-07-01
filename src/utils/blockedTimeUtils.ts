
// This file is kept minimal for any remaining legacy data migration needs
// Most blocked time functionality now uses the dedicated blocked_time table

// Legacy validation function - can be removed once all data is migrated
export const validateBlockedTimeConfig = (): { isValid: boolean; error?: string } => {
  console.warn('[blockedTimeUtils] This utility is deprecated. Use the blocked_time table instead.');
  return { isValid: true };
};

// Export a migration status check
export const isLegacyMigrationComplete = (): boolean => {
  console.log('[blockedTimeUtils] Check if legacy blocked time migration is complete');
  return true; // Set to false if still migrating data
};
