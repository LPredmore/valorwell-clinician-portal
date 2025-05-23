
import { DateTime } from 'luxon';

// Generic log function
export const log = (context: string, message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${context}] ${message}`, data || '');
  }
};

// Generic warning function
export const warn = (context: string, message: string, data?: any) => {
    console.warn(`[${context}] ${message}`, data || '');
};

// Generic error function
export const error = (context: string, message: string, data?: any) => {
    console.error(`[${context}] ${message}`, data || '');
};

export class DebugUtils {
  static VERBOSE = process.env.NODE_ENV !== 'production';

  static log(context: string, message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${context}] ${message}`, data || '');
    }
  }

  static warn(context: string, message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[${context}] ${message}`, data || '');
    }
  }

  static error(context: string, message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${context}] ${message}`, data || '');
    }
  }

  static info(context: string, message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[${context}] ${message}`, data || '');
    }
  }
  
  // Add methods that might be referenced elsewhere
  static analyzeAppointment(context: string, appointment: any, timezone: string) {
    this.log(context, 'Analyzing appointment data', { appointment, timezone });
  }
  
  static visualizeAppointment(context: string, appointment: any) {
    this.log(context, 'Visualizing appointment', appointment);
  }
  
  static visualizeAppointmentBlock(context: string, block: any) {
    this.log(context, 'Visualizing appointment block', block);
  }
  
  static trackTimezoneConversion(context: string, timestamp: string, timezone: string) {
    if (!timestamp) {
      this.warn(context, 'Cannot track timezone conversion for null timestamp');
      return;
    }
    
    try {
      const utcTime = DateTime.fromISO(timestamp, { zone: 'utc' });
      const localTime = utcTime.setZone(timezone);
      this.log(context, 'Timezone conversion tracking', { 
        utc: timestamp, 
        local: localTime.toISO(),
        offset: localTime.offset 
      });
    } catch (e) {
      this.error(context, 'Error tracking timezone conversion', e);
    }
  }
  
  static compareDataStructures(context: string, expected: any, actual: any) {
    const expectedKeys = Object.keys(expected || {});
    const actualKeys = Object.keys(actual || {});
    
    const missingKeys = expectedKeys.filter(k => !actualKeys.includes(k));
    const extraKeys = actualKeys.filter(k => !expectedKeys.includes(k));
    
    this.log(context, 'Data structure comparison', { 
      missingKeys, 
      extraKeys, 
      matching: missingKeys.length === 0 && extraKeys.length === 0 
    });
  }
  
  static logHookParameterMismatch(hookName: string, expected: any, actual: any) {
    this.warn(hookName, 'Hook parameter mismatch', { expected, actual });
  }
  
  static validateHookParameters(context: string, params: any) {
    const nullParams = Object.entries(params)
      .filter(([_, v]) => v === null || v === undefined)
      .map(([k]) => k);
      
    if (nullParams.length > 0) {
      this.warn(context, 'Some parameters are null or undefined', nullParams);
    }
  }
  
  static visualizeAvailabilityBlock(context: string, block: any) {
    this.log(context, 'Visualizing availability block', block);
  }
}

export const loadDebugModule = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Debug module loaded');
  }
};

// Function to log appointment details
export const logAppointment = (context: string, appointment: any, timezone: string) => {
  if (!appointment) {
    log(context, 'Appointment is null/undefined');
    return;
  }

  log(context, 'Appointment details', {
    id: appointment.id,
    client_id: appointment.client_id,
    start_at: appointment.start_at,
    end_at: appointment.end_at,
    clientName: appointment.clientName,
    timezone
  });
};

// Function to log availability block details
export const logAvailabilityBlock = (context: string, block: any, timezone: string) => {
  if (!block) {
    log(context, 'Availability block is null/undefined');
    return;
  }

  log(context, 'Availability block details', {
    id: block.id,
    clinician_id: block.clinician_id,
    start_at: block.start_at,
    end_at: block.end_at,
    timezone
  });
};

// Function to log client details
export const logClient = (context: string, client: any) => {
  if (!client) {
    log(context, 'Client is null/undefined');
    return;
  }

  log(context, 'Client details', {
    id: client.id,
    client_first_name: client.client_first_name,
    client_last_name: client.client_last_name,
    client_preferred_name: client.client_preferred_name
  });
};

// Function to log timezone conversion
export const logTimezoneConversion = (context: string, time: string, timezone: string) => {
    if (!time) {
        log(context, 'Time is null/undefined');
        return;
    }

    try {
        const utcTime = DateTime.fromISO(time, { zone: 'utc' });
        const localTime = utcTime.setZone(timezone);

        log(context, 'Timezone conversion details', {
            utcTime: utcTime.toISO(),
            localTime: localTime.toISO(),
            timezone: timezone
        });
    } catch (e) {
        error(context, 'Error during timezone conversion', {
            time: time,
            timezone: timezone,
            error: e
        });
    }
};

// Function to log appointment transformation
export const logAppointmentTransformation = (context: string, appointment: any, timezone: string) => {
    if (!appointment) {
        log(context, 'Appointment is null/undefined');
        return;
    }

    try {
        const startAt = DateTime.fromISO(appointment.start_at, { zone: 'utc' });
        const endAt = DateTime.fromISO(appointment.end_at, { zone: 'utc' });

        log(context, 'Appointment transformation details', {
            id: appointment.id,
            start_at_utc: appointment.start_at,
            end_at_utc: appointment.end_at,
            start_at_local: startAt.setZone(timezone).toISO(),
            end_at_local: endAt.setZone(timezone).toISO(),
            timezone: timezone
        });
    } catch (e) {
        error(context, 'Error during appointment transformation', {
            appointmentId: appointment.id,
            error: e
        });
    }
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
