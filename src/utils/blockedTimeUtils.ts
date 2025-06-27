
// Special client ID for blocked time appointments
export const BLOCKED_TIME_CLIENT_ID = '00000000-0000-0000-0000-000000000001';

// Check if an appointment is a blocked time appointment with null safety
export const isBlockedTimeAppointment = (appointment: any): boolean => {
  if (!appointment) {
    console.warn('[blockedTimeUtils] isBlockedTimeAppointment called with null/undefined appointment');
    return false;
  }
  
  // Multiple checks for blocked time identification with null safety
  const hasBlockedClientId = appointment.client_id === BLOCKED_TIME_CLIENT_ID;
  const hasBlockedType = appointment.type === 'Blocked Time';
  const hasBlockedStatus = appointment.status === 'blocked';
  
  const isBlocked = hasBlockedClientId || hasBlockedType || hasBlockedStatus;
  
  if (isBlocked) {
    console.log('[blockedTimeUtils] Identified blocked time appointment:', {
      id: appointment.id,
      client_id: appointment.client_id,
      type: appointment.type,
      status: appointment.status
    });
  }
  
  return isBlocked;
};

// Get blocked time display name with null safety
export const getBlockedTimeDisplayName = (appointment: any): string => {
  if (!appointment) {
    console.warn('[blockedTimeUtils] getBlockedTimeDisplayName called with null/undefined appointment');
    return 'Blocked';
  }
  
  if (appointment.notes && typeof appointment.notes === 'string' && appointment.notes.includes('Blocked time:')) {
    return appointment.notes.replace('Blocked time: ', '');
  }
  return 'Blocked';
};

// Create a blocked time appointment object for display with proper error handling
export const createBlockedTimeAppointment = (
  startTime: string,
  endTime: string,
  clinicianId: string,
  label: string = 'Blocked'
) => {
  if (!startTime || !endTime || !clinicianId) {
    console.error('[blockedTimeUtils] createBlockedTimeAppointment called with missing required parameters:', {
      startTime, endTime, clinicianId
    });
    throw new Error('Missing required parameters for blocked time appointment creation');
  }
  
  return {
    id: `blocked-${Date.now()}`,
    client_id: BLOCKED_TIME_CLIENT_ID,
    clinician_id: clinicianId,
    start_at: startTime,
    end_at: endTime,
    type: 'Blocked Time',
    status: 'blocked',
    notes: `Blocked time: ${label}`,
    clientName: 'Blocked',
    client: {
      client_first_name: 'Blocked',
      client_last_name: 'Time',
      client_preferred_name: 'Blocked',
      client_email: 'blocked@system.internal',
      client_phone: '000-000-0000',
      client_status: 'active',
      client_date_of_birth: '1900-01-01',
      client_gender: null,
      client_address: 'System Internal',
      client_city: 'System',
      client_state: 'Internal',
      client_zipcode: '00000'
    }
  };
};

// Validation function to ensure BLOCKED_TIME_CLIENT_ID is properly configured
export const validateBlockedTimeConfig = (): { isValid: boolean; error?: string } => {
  if (!BLOCKED_TIME_CLIENT_ID) {
    return { isValid: false, error: 'BLOCKED_TIME_CLIENT_ID is not defined' };
  }
  
  if (typeof BLOCKED_TIME_CLIENT_ID !== 'string') {
    return { isValid: false, error: 'BLOCKED_TIME_CLIENT_ID must be a string' };
  }
  
  if (BLOCKED_TIME_CLIENT_ID.length === 0) {
    return { isValid: false, error: 'BLOCKED_TIME_CLIENT_ID cannot be empty' };
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(BLOCKED_TIME_CLIENT_ID)) {
    return { isValid: false, error: 'BLOCKED_TIME_CLIENT_ID must be a valid UUID format' };
  }
  
  return { isValid: true };
};

// Initialize validation on module load
const configValidation = validateBlockedTimeConfig();
if (!configValidation.isValid) {
  console.error('[blockedTimeUtils] Configuration error:', configValidation.error);
}
