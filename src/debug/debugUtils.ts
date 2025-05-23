import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { TimeBlock, AppointmentBlock } from '@/components/calendar/week-view/types';

/**
 * Centralized debug utility for the application
 * Provides structured logging, data visualization, and debugging tools
 */
export class DebugUtils {
  private static readonly PREFIX = '🔍 [DEBUG]';
  private static readonly ERROR_PREFIX = '❌ [ERROR]';
  private static readonly WARNING_PREFIX = '⚠️ [WARNING]';
  private static readonly INFO_PREFIX = '📝 [INFO]';
  
  /**
   * Enable or disable detailed debug logging
   * Set to false in production environments
   */
  public static VERBOSE = import.meta.env.MODE === 'development';
  
  /**
   * Log with structured formatting and optional object inspection
   */
  public static log(context: string, message: string, data?: any): void {
    if (!this.VERBOSE) return;
    
    console.log(`${this.PREFIX} [${context}] ${message}`);
    if (data !== undefined) {
      console.log(this.formatData(data));
    }
  }
  
  /**
   * Log error with structured formatting
   */
  public static error(context: string, message: string, error?: any): void {
    console.error(`${this.ERROR_PREFIX} [${context}] ${message}`);
    if (error) {
      console.error(error);
    }
  }
  
  /**
   * Log warning with structured formatting
   */
  public static warn(context: string, message: string, data?: any): void {
    console.warn(`${this.WARNING_PREFIX} [${context}] ${message}`);
    if (data !== undefined) {
      console.warn(this.formatData(data));
    }
  }
  
  /**
   * Log info with structured formatting
   */
  public static info(context: string, message: string, data?: any): void {
    if (!this.VERBOSE) return;
    
    console.info(`${this.INFO_PREFIX} [${context}] ${message}`);
    if (data !== undefined) {
      console.info(this.formatData(data));
    }
  }
  
  /**
   * Format data for better console visualization
   */
  private static formatData(data: any): any {
    if (data === null || data === undefined) {
      return 'null/undefined';
    }
    
    // Handle DateTime objects specially
    if (data instanceof DateTime) {
      return {
        iso: data.toISO(),
        formatted: data.toFormat('yyyy-MM-dd HH:mm:ss'),
        zone: data.zoneName,
        offset: data.offset,
        isValid: data.isValid,
        invalidReason: data.invalidReason || 'N/A'
      };
    }
    
    // Handle arrays of DateTime objects
    if (Array.isArray(data) && data.length > 0 && data[0] instanceof DateTime) {
      return data.map(dt => this.formatData(dt));
    }
    
    return data;
  }
  
  /**
   * Log function entry with parameters
   */
  public static logFunctionEntry(context: string, functionName: string, params: Record<string, any>): void {
    if (!this.VERBOSE) return;
    this.log(context, `➡️ ${functionName}() called with:`, params);
  }
  
  /**
   * Log function exit with return value
   */
  public static logFunctionExit(context: string, functionName: string, returnValue: any): void {
    if (!this.VERBOSE) return;
    this.log(context, `⬅️ ${functionName}() returned:`, returnValue);
  }
  
  /**
   * Compare expected vs actual data structures
   */
  public static compareDataStructures(context: string, expected: any, actual: any): void {
    if (!this.VERBOSE) return;
    
    const expectedKeys = Object.keys(expected || {}).sort();
    const actualKeys = Object.keys(actual || {}).sort();
    
    const missingKeys = expectedKeys.filter(key => !actualKeys.includes(key));
    const extraKeys = actualKeys.filter(key => !expectedKeys.includes(key));
    const commonKeys = expectedKeys.filter(key => actualKeys.includes(key));
    
    const typeMismatches = commonKeys.filter(key => {
      const expectedType = typeof expected[key];
      const actualType = typeof actual[key];
      return expectedType !== actualType;
    });
    
    if (missingKeys.length > 0 || extraKeys.length > 0 || typeMismatches.length > 0) {
      this.warn(context, `Data structure mismatch`, {
        missingKeys,
        extraKeys,
        typeMismatches: typeMismatches.map(key => ({
          key,
          expectedType: typeof expected[key],
          actualType: typeof actual[key]
        }))
      });
      
      console.log(`
🔍 DATA STRUCTURE COMPARISON [${context}]
┌─────────────────────────────────────────────────────────────────┐
│ EXPECTED:
${JSON.stringify(expected, null, 2).split('\n').map(line => `│   ${line}`).join('\n')}
├─────────────────────────────────────────────────────────────────┤
│ ACTUAL:
${JSON.stringify(actual, null, 2).split('\n').map(line => `│   ${line}`).join('\n')}
└─────────────────────────────────────────────────────────────────┘
      `);
    } else {
      this.info(context, `Data structures match`);
    }
  }
  
  /**
   * Visualize appointment data in the console
   */
  public static visualizeAppointment(appointment: Appointment, userTimeZone: string): void {
    if (!this.VERBOSE) return;
    
    const startLocal = DateTime.fromISO(appointment.start_at).setZone(userTimeZone);
    const endLocal = DateTime.fromISO(appointment.end_at).setZone(userTimeZone);
    
    console.log(`
🗓️ APPOINTMENT: ${appointment.id}
┌─────────────────────────────────────────────────────────────────┐
│ Client: ${appointment.clientName || `${appointment.client_id} (ID only)`}
│ Type: ${appointment.type}
│ Status: ${appointment.status}
├─────────────────────────────────────────────────────────────────┤
│ UTC Start: ${appointment.start_at}
│ UTC End: ${appointment.end_at}
├─────────────────────────────────────────────────────────────────┤
│ Local Start (${userTimeZone}): ${startLocal.toFormat('yyyy-MM-dd HH:mm:ss')}
│ Local End (${userTimeZone}): ${endLocal.toFormat('yyyy-MM-dd HH:mm:ss')}
└─────────────────────────────────────────────────────────────────┘
    `);
  }
  
  /**
   * Visualize appointment block data in the console
   */
  public static visualizeAppointmentBlock(block: AppointmentBlock, userTimeZone: string): void {
    if (!this.VERBOSE) return;
    
    console.log(`
🧩 APPOINTMENT BLOCK: ${block.id}
┌─────────────────────────────────────────────────────────────────┐
│ Client: ${block.clientName || `${block.clientId} (ID only)`}
│ Type: ${block.type}
├─────────────────────────────────────────────────────────────────┤
│ Start (${block.start.zoneName}): ${block.start.toFormat('yyyy-MM-dd HH:mm:ss')}
│ End (${block.end.zoneName}): ${block.end.toFormat('yyyy-MM-dd HH:mm:ss')}
│ Day: ${block.day ? block.day.toFormat('yyyy-MM-dd') : 'Not specified'}
└─────────────────────────────────────────────────────────────────┘
    `);
  }
  
  /**
   * Visualize availability block data in the console
   */
  public static visualizeAvailabilityBlock(block: AvailabilityBlock, userTimeZone: string): void {
    if (!this.VERBOSE) return;
    
    const startLocal = block.start_at ? DateTime.fromISO(block.start_at).setZone(userTimeZone) : null;
    const endLocal = block.end_at ? DateTime.fromISO(block.end_at).setZone(userTimeZone) : null;
    
    console.log(`
⏰ AVAILABILITY BLOCK: ${block.id}
┌─────────────────────────────────────────────────────────────────┐
│ Clinician: ${block.clinician_id}
│ Active: ${block.is_active ? 'Yes' : 'No'}
├─────────────────────────────────────────────────────────────────┤
│ UTC Start: ${block.start_at}
│ UTC End: ${block.end_at}
├─────────────────────────────────────────────────────────────────┤
│ Local Start (${userTimeZone}): ${startLocal ? startLocal.toFormat('yyyy-MM-dd HH:mm:ss') : 'N/A'}
│ Local End (${userTimeZone}): ${endLocal ? endLocal.toFormat('yyyy-MM-dd HH:mm:ss') : 'N/A'}
├─────────────────────────────────────────────────────────────────┤
│ Day of Week: ${(block as any).day_of_week || 'N/A'}
│ Legacy Start Time: ${(block as any).start_time || 'N/A'}
│ Legacy End Time: ${(block as any).end_time || 'N/A'}
└─────────────────────────────────────────────────────────────────┘
    `);
  }
  
  /**
   * Track timezone conversion
   */
  public static trackTimezoneConversion(context: string, fromTime: string | DateTime, fromZone: string, toZone: string, result: DateTime): void {
    if (!this.VERBOSE) return;
    
    const fromTimeStr = typeof fromTime === 'string' ? fromTime : fromTime.toISO();
    
    console.log(`
🌐 TIMEZONE CONVERSION [${context}]
┌─────────────────────────────────────────────────────────────────┐
│ From: ${fromTimeStr} (${fromZone})
│ To: ${result.toISO()} (${toZone})
│ 
│ From (formatted): ${typeof fromTime === 'string' 
                      ? DateTime.fromISO(fromTime, { zone: fromZone }).toFormat('yyyy-MM-dd HH:mm:ss')
                      : fromTime.toFormat('yyyy-MM-dd HH:mm:ss')}
│ To (formatted): ${result.toFormat('yyyy-MM-dd HH:mm:ss')}
│ 
│ Valid: ${result.isValid ? 'Yes' : 'No'}
│ Invalid Reason: ${result.invalidReason || 'N/A'}
└─────────────────────────────────────────────────────────────────┘
    `);
  }
  
  /**
   * Analyze an appointment's timezone conversions and log detailed information
   */
  public static analyzeAppointment(appointment: Appointment, userTimeZone: string): void {
    if (!this.VERBOSE) return;
    
    if (!appointment) {
      this.error('AppointmentDebug', 'Cannot analyze null appointment');
      return;
    }

    try {
      // Parse UTC timestamps
      const utcStart = DateTime.fromISO(appointment.start_at, { zone: 'UTC' });
      const utcEnd = DateTime.fromISO(appointment.end_at, { zone: 'UTC' });

      // Convert to user's timezone
      const localStart = utcStart.setZone(userTimeZone);
      const localEnd = utcEnd.setZone(userTimeZone);

      // Check for DST transitions
      const isDSTTransition = this.checkForDSTTransition(utcStart, utcEnd, userTimeZone);

      // Log detailed analysis
      console.log(`
🔍 APPOINTMENT ANALYSIS: ${appointment.id}
┌─────────────────────────────────────────────────────────────────┐
│ Client: ${appointment.clientName || appointment.client_id}
│ Type: ${appointment.type}
│ Status: ${appointment.status}
├─────────────────────────────────────────────────────────────────┤
│ UTC Start: ${appointment.start_at}
│   → Parsed: ${utcStart.toISO()} (Valid: ${utcStart.isValid})
│   → Weekday: ${utcStart.weekdayLong}
│
│ UTC End: ${appointment.end_at}
│   → Parsed: ${utcEnd.toISO()} (Valid: ${utcEnd.isValid})
│   → Duration: ${utcEnd.diff(utcStart).as('minutes')} minutes
├─────────────────────────────────────────────────────────────────┤
│ Local Start (${userTimeZone}): ${localStart.toISO()}
│   → Formatted: ${localStart.toFormat('yyyy-MM-dd HH:mm:ss')}
│   → Weekday: ${localStart.weekdayLong}
│   → Offset: UTC${localStart.toFormat('Z')} (${localStart.offsetNameShort})
│
│ Local End (${userTimeZone}): ${localEnd.toISO()}
│   → Formatted: ${localEnd.toFormat('yyyy-MM-dd HH:mm:ss')}
│   → Offset: UTC${localEnd.toFormat('Z')} (${localEnd.offsetNameShort})
│   → Duration: ${localEnd.diff(localStart).as('minutes')} minutes
├─────────────────────────────────────────────────────────────────┤
│ DST Transition: ${isDSTTransition ? '⚠️ YES - POTENTIAL ISSUE' : 'No'}
│ Day Boundary Cross: ${utcStart.day !== localStart.day ? '⚠️ YES - POTENTIAL ISSUE' : 'No'}
│ Duration Mismatch: ${
        Math.abs(utcEnd.diff(utcStart).as('minutes') - localEnd.diff(localStart).as('minutes')) > 1
          ? '⚠️ YES - POTENTIAL ISSUE'
          : 'No'
      }
└─────────────────────────────────────────────────────────────────┘
      `);
    } catch (error) {
      this.error('AppointmentDebug', 'Error analyzing appointment', {
        appointmentId: appointment.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check if a time range crosses a DST transition
   */
  private static checkForDSTTransition(
    utcStart: DateTime,
    utcEnd: DateTime,
    timezone: string
  ): boolean {
    try {
      // Check hourly intervals between start and end for offset changes
      const hours = Math.ceil(utcEnd.diff(utcStart).as('hours'));
      let previousOffset = utcStart.setZone(timezone).offset;
      
      for (let i = 1; i <= hours; i++) {
        const checkTime = utcStart.plus({ hours: i }).setZone(timezone);
        if (checkTime.offset !== previousOffset) {
          return true;
        }
        previousOffset = checkTime.offset;
      }
      
      return false;
    } catch (error) {
      this.error('AppointmentDebug', 'Error checking DST transition', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Log hook parameter mismatch between expected and actual parameters
   */
  public static logHookParameterMismatch(
    hookName: string, 
    expectedParams: Record<string, any>, 
    actualParams: any[]
  ): void {
    if (!this.VERBOSE) return;
    
    this.error('CalendarDebug', `Parameter mismatch in ${hookName} hook`, {
      expected: Object.keys(expectedParams),
      actual: actualParams.map((param, index) => `param${index+1}: ${typeof param}`)
    });
    
    console.error(`
❌ HOOK PARAMETER MISMATCH in ${hookName}
┌─────────────────────────────────────────────────────────────────┐
│ Expected (named parameters):
${Object.entries(expectedParams).map(([key, value]) => 
  `│   ${key}: ${value === undefined ? 'undefined' : typeof value} ${value === null ? '(null)' : ''}`
).join('\n')}
├─────────────────────────────────────────────────────────────────┤
│ Actual (positional parameters):
${actualParams.map((param, index) => 
  `│   param${index+1}: ${param === undefined ? 'undefined' : typeof param} ${param === null ? '(null)' : ''}`
).join('\n')}
└─────────────────────────────────────────────────────────────────┘
    `);
  }
  
  /**
   * Log hook parameter validation
   */
  public static validateHookParameters(
    hookName: string,
    params: Record<string, any>
  ): void {
    if (!this.VERBOSE) return;
    
    const issues: string[] = [];
    
    // Check for null or undefined parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) {
        issues.push(`Parameter '${key}' is undefined`);
      } else if (value === null) {
        issues.push(`Parameter '${key}' is null`);
      }
    });
    
    // Check specific parameters
    if ('userTimeZone' in params && typeof params.userTimeZone === 'string') {
      try {
        DateTime.now().setZone(params.userTimeZone);
      } catch (error) {
        issues.push(`Invalid timezone '${params.userTimeZone}'`);
      }
    }
    
    if ('currentDate' in params && params.currentDate instanceof Date) {
      if (isNaN(params.currentDate.getTime())) {
        issues.push(`Invalid date: ${params.currentDate}`);
      }
    }
    
    // Log results
    if (issues.length > 0) {
      this.warn('CalendarDebug', `Parameter validation issues in ${hookName}`, issues);
    } else {
      this.info('CalendarDebug', `All parameters valid for ${hookName}`, params);
    }
  }
}

// Export a conditional import helper to only load debug code in development
export function loadDebugModule<T>(importFn: () => Promise<T>): Promise<T | null> {
  if (import.meta.env.MODE === 'development') {
    return importFn();
  }
  return Promise.resolve(null);
}
