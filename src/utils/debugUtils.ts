import { DateTime } from 'luxon';

const DEBUG_ENABLED = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const log = (context: string, message: string, data?: any) => {
  if (DEBUG_ENABLED) {
    console.log(`[${context}] ${message}`, data || '');
  }
};

export const warn = (context: string, message: string, data?: any) => {
  if (DEBUG_ENABLED) {
    console.warn(`[${context}] ${message}`, data || '');
  }
};

export const error = (context: string, message: string, data?: any) => {
  if (DEBUG_ENABLED) {
    console.error(`[${context}] ${message}`, data || '');
  }
};

export class DebugUtils {
  static log(context: string, message: string, data?: any) {
    if (DEBUG_ENABLED) {
      console.log(`[${context}] ${message}`, data || '');
    }
  }

  static warn(context: string, message: string, data?: any) {
    if (DEBUG_ENABLED) {
      console.warn(`[${context}] ${message}`, data || '');
    }
  }

  static error(context: string, message: string, data?: any) {
    if (DEBUG_ENABLED) {
      console.error(`[${context}] ${message}`, data || '');
    }
  }
}

export const logAppointmentTransformation = (context: string, appointment: any, timezone: string) => {
  if (!appointment) {
    log(context, 'Appointment is null/undefined');
    return;
  }

  log(context, 'Appointment transformation details', {
    id: appointment.id,
    client_id: appointment.client_id,
    start_at_utc: appointment.start_at,
    end_at_utc: appointment.end_at,
    timezone
  });
};

export const logTimezoneConversion = (context: string, timestamp: string, timezone: string) => {
  if (!timestamp) {
    log(context, 'Timestamp is null/undefined');
    return;
  }

  try {
    const utcTime = DateTime.fromISO(timestamp, { zone: 'utc' });
    const localTime = utcTime.setZone(timezone);

    log(context, 'Timezone conversion details', {
      utcTime: utcTime.toISO(),
      localTime: localTime.toISO(),
      timezone
    });
  } catch (e: any) {
    error(context, 'Error converting timezone', {
      timestamp,
      timezone,
      message: e.message
    });
  }
};

export const logAvailabilityBlock = (context: string, block: any, timezone: string) => {
  if (!block) {
    log(context, 'Availability block is null/undefined');
    return;
  }

  log(context, 'Availability block details', {
    id: block.id,
    clinician_id: block.clinician_id,
    start_at_utc: block.start_at,
    end_at_utc: block.end_at,
    timezone
  });
};

// Update the logAppointmentBlock function to handle optional day property
export const logAppointmentBlock = (context: string, block: any, timezone: string) => {
  if (!block) {
    log(context, 'Appointment block is null/undefined');
    return;
  }

  log(context, 'Appointment block details', {
    id: block.id,
    clientId: block.clientId,
    clientName: block.clientName,
    start: block.start?.toFormat?.('yyyy-MM-dd HH:mm') || 'Invalid start',
    end: block.end?.toFormat?.('yyyy-MM-dd HH:mm') || 'Invalid end',
    day: block.day?.toFormat?.('yyyy-MM-dd') || 'No day property',
    type: block.type,
    status: block.status,
    timezone
  });
};
