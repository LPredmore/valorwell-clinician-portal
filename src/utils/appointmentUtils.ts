
import { Appointment } from '@/types/appointment';

/**
 * Formats a client name consistently across the application
 */
export const formatClientName = (client: any): string => {
  if (!client) return 'Unknown Client';
  
  const preferredName = client.client_preferred_name?.trim();
  const firstName = client.client_first_name?.trim();
  const lastName = client.client_last_name?.trim();
  
  // Use preferred name if available, otherwise use first name
  const displayFirstName = preferredName || firstName || '';
  
  if (displayFirstName && lastName) {
    return `${displayFirstName} ${lastName}`;
  }
  
  return displayFirstName || lastName || 'Unknown Client';
};

/**
 * Converts an AppointmentBlock to a full Appointment object
 * This handles the case where calendar components pass AppointmentBlock objects
 * but we need full Appointment objects for dialogs and forms
 */
export const convertAppointmentBlockToAppointment = (
  appointmentBlock: any,
  originalAppointments: Appointment[]
): Appointment => {
  console.log('[convertAppointmentBlockToAppointment] Converting:', {
    blockId: appointmentBlock.id,
    hasStart: !!appointmentBlock.start,
    hasEnd: !!appointmentBlock.end,
    startType: typeof appointmentBlock.start,
    endType: typeof appointmentBlock.end
  });

  // First, try to find the original appointment from the appointments array
  const originalAppointment = originalAppointments.find(a => a.id === appointmentBlock.id);
  if (originalAppointment) {
    console.log('[convertAppointmentBlockToAppointment] Found original appointment, using it');
    return originalAppointment;
  }

  // Convert DateTime objects to ISO strings
  let startAt: string;
  let endAt: string;

  try {
    // Handle Luxon DateTime objects
    if (appointmentBlock.start && typeof appointmentBlock.start === 'object' && appointmentBlock.start.toISO) {
      startAt = appointmentBlock.start.toUTC().toISO();
    } else if (typeof appointmentBlock.start === 'string') {
      startAt = appointmentBlock.start;
    } else {
      throw new Error('Invalid start time format');
    }

    if (appointmentBlock.end && typeof appointmentBlock.end === 'object' && appointmentBlock.end.toISO) {
      endAt = appointmentBlock.end.toUTC().toISO();
    } else if (typeof appointmentBlock.end === 'string') {
      endAt = appointmentBlock.end;
    } else {
      throw new Error('Invalid end time format');
    }

    console.log('[convertAppointmentBlockToAppointment] Converted times:', {
      startAt,
      endAt
    });

  } catch (error) {
    console.error('[convertAppointmentBlockToAppointment] DateTime conversion error:', error);
    // Fallback to current time if conversion fails
    const now = new Date().toISOString();
    startAt = now;
    endAt = now;
  }

  // Create the appointment object
  const appointment: Appointment = {
    id: appointmentBlock.id || appointmentBlock.appointmentId,
    client_id: appointmentBlock.clientId || appointmentBlock.client_id || '',
    clinician_id: appointmentBlock.clinicianId || '',
    start_at: startAt,
    end_at: endAt,
    type: appointmentBlock.type || 'appointment',
    status: appointmentBlock.status || 'scheduled',
    clientName: appointmentBlock.clientName || 'Unknown Client'
  };

  console.log('[convertAppointmentBlockToAppointment] Created appointment:', {
    id: appointment.id,
    clientName: appointment.clientName,
    start_at: appointment.start_at,
    end_at: appointment.end_at
  });

  return appointment;
};
