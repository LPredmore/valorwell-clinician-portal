
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
  static VERBOSE = DEBUG_ENABLED;

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

  static info(context: string, message: string, data?: any) {
    if (DEBUG_ENABLED) {
      console.info(`[${context}] ${message}`, data || '');
    }
  }
  
  // Add methods that are referenced elsewhere in the codebase
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
  if (DEBUG_ENABLED) {
    console.log('Debug module loaded');
  }
};

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
