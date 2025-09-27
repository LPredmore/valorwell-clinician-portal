/**
 * Utility functions for safe UUID handling and type conversion
 * Addresses the type mismatch between UUID and TEXT in client-therapist assignments
 */

/**
 * Safely converts a UUID or UUID string to text for database queries
 * @param uuid - UUID string or null/undefined
 * @returns string representation of UUID or null
 */
export const uuidToText = (uuid: string | null | undefined): string | null => {
  if (!uuid || uuid === 'null' || uuid.trim() === '') {
    return null;
  }
  return uuid.toString();
};

/**
 * Validates if a string is a valid UUID format
 * @param str - String to validate
 * @returns boolean indicating if string is valid UUID
 */
export const isValidUUID = (str: string | null | undefined): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Safely converts a text value to UUID format for database operations
 * @param text - Text value that should be a UUID
 * @returns UUID string if valid, null otherwise
 */
export const textToUUID = (text: string | null | undefined): string | null => {
  if (!text || text === 'null' || text.trim() === '') {
    return null;
  }
  
  if (isValidUUID(text)) {
    return text;
  }
  
  console.warn(`Invalid UUID format: ${text}`);
  return null;
};

/**
 * DEPRECATED: Legacy function for UUID/text comparisons - no longer needed after 2025 migration
 * All UUID columns now use direct UUID comparisons without casting
 * @deprecated Use direct UUID comparisons instead
 */
export const createUUIDTextFilter = (columnName: string, textValue: string | null | undefined) => {
  console.warn('createUUIDTextFilter is deprecated - use direct UUID comparisons');
  if (!textValue || textValue === 'null' || textValue.trim() === '') {
    return { column: columnName, value: null };
  }
  
  // Direct UUID comparison (no casting needed)
  return { column: columnName, value: textValue };
};

/**
 * Logs assignment operations for debugging purposes
 * @param operation - Type of operation (fetch, assign, unassign)
 * @param clientId - Client ID
 * @param therapistId - Therapist ID (text format)
 * @param context - Additional context
 */
export const logAssignmentOperation = (
  operation: 'fetch' | 'assign' | 'unassign' | 'validate',
  clientId?: string,
  therapistId?: string | null,
  context?: string
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Assignment ${operation.toUpperCase()}]`, {
      clientId,
      therapistId,
      therapistIdValid: isValidUUID(therapistId),
      context,
      timestamp: new Date().toISOString()
    });
  }
};