
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

// Create a blocked time appointment object for display
export const createBlockedTimeAppointment = (
  startTime: string,
  endTime: string,
  clinicianId: string,
  label: string = 'Blocked'
) => ({
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
});
