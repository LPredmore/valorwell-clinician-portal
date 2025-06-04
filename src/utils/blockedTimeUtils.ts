
// Special client ID for blocked time appointments
export const BLOCKED_TIME_CLIENT_ID = '00000000-0000-0000-0000-000000000001';

// Check if an appointment is a blocked time appointment
export const isBlockedTimeAppointment = (appointment: any): boolean => {
  return appointment.client_id === BLOCKED_TIME_CLIENT_ID || 
         appointment.type === 'Blocked Time' ||
         appointment.status === 'blocked';
};

// Get blocked time display name
export const getBlockedTimeDisplayName = (appointment: any): string => {
  if (appointment.notes && appointment.notes.includes('Blocked time:')) {
    return appointment.notes.replace('Blocked time: ', '');
  }
  return 'Blocked';
};
