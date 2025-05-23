import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { DebugUtils } from './debugUtils';

/**
 * Calendar-specific debugging utilities
 * Extends the general DebugUtils with calendar-specific functionality
 */
export class CalendarDebugUtils {
  private static readonly CONTEXT = 'CalendarDebug';

  /**
   * Log hook parameter mismatch between expected and actual parameters
   */
  public static logHookParameterMismatch(
    hookName: string, 
    expectedParams: Record<string, any>, 
    actualParams: any[]
  ): void {
    DebugUtils.error(this.CONTEXT, `Parameter mismatch in ${hookName} hook`, {
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
   * Log appointment data transformation
   */
  public static logAppointmentTransformation(
    stage: string,
    appointment: Appointment,
    userTimeZone: string
  ): void {
    const startLocal = DateTime.fromISO(appointment.start_at).setZone(userTimeZone);
    const endLocal = DateTime.fromISO(appointment.end_at).setZone(userTimeZone);
    
    DebugUtils.log(this.CONTEXT, `Appointment transformation [${stage}]`, {
      id: appointment.id,
      clientId: appointment.client_id,
      clientName: appointment.clientName || 'Unknown',
      utcStart: appointment.start_at,
      utcEnd: appointment.end_at,
      localStart: startLocal.toISO(),
      localEnd: endLocal.toISO(),
      localDay: startLocal.toFormat('yyyy-MM-dd'),
      localTime: `${startLocal.toFormat('HH:mm')} - ${endLocal.toFormat('HH:mm')}`,
      timezone: userTimeZone
    });
  }

  /**
   * Log timezone conversion for appointments
   */
  public static logTimezoneConversion(
    context: string,
    utcTime: string,
    userTimeZone: string
  ): void {
    try {
      const localTime = DateTime.fromISO(utcTime, { zone: 'UTC' }).setZone(userTimeZone);
      
      DebugUtils.log(this.CONTEXT, `Timezone conversion [${context}]`, {
        utc: utcTime,
        local: localTime.toISO(),
        timezone: userTimeZone,
        offset: localTime.offset / 60, // Convert minutes to hours
        isDST: localTime.isInDST,
        localFormatted: localTime.toFormat('yyyy-MM-dd HH:mm:ss')
      });
    } catch (error) {
      DebugUtils.error(this.CONTEXT, `Timezone conversion error [${context}]`, {
        utc: utcTime,
        timezone: userTimeZone,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Log availability block data
   */
  public static logAvailabilityBlock(
    context: string,
    block: AvailabilityBlock,
    userTimeZone: string
  ): void {
    try {
      const startLocal = block.start_at 
        ? DateTime.fromISO(block.start_at, { zone: 'UTC' }).setZone(userTimeZone)
        : null;
      const endLocal = block.end_at
        ? DateTime.fromISO(block.end_at, { zone: 'UTC' }).setZone(userTimeZone)
        : null;
      
      DebugUtils.log(this.CONTEXT, `Availability block [${context}]`, {
        id: block.id,
        clinicianId: block.clinician_id,
        utcStart: block.start_at,
        utcEnd: block.end_at,
        localStart: startLocal?.toISO() || 'Invalid',
        localEnd: endLocal?.toISO() || 'Invalid',
        localDay: startLocal?.toFormat('yyyy-MM-dd') || 'Invalid',
        localTimeRange: startLocal && endLocal 
          ? `${startLocal.toFormat('HH:mm')} - ${endLocal.toFormat('HH:mm')}`
          : 'Invalid time range',
        isActive: block.is_active,
        timezone: userTimeZone
      });
    } catch (error) {
      DebugUtils.error(this.CONTEXT, `Error processing availability block [${context}]`, {
        blockId: block.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Log hook parameter validation
   */
  public static validateHookParameters(
    hookName: string,
    params: Record<string, any>
  ): void {
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
      DebugUtils.warn(this.CONTEXT, `Parameter validation issues in ${hookName}`, issues);
    } else {
      DebugUtils.info(this.CONTEXT, `All parameters valid for ${hookName}`, params);
    }
  }

  /**
   * Log data structure comparison
   */
  public static compareDataStructures(
    context: string,
    expected: any,
    actual: any
  ): void {
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
      DebugUtils.warn(this.CONTEXT, `Data structure mismatch [${context}]`, {
        missingKeys,
        extraKeys,
        typeMismatches: typeMismatches.map(key => ({
          key,
          expectedType: typeof expected[key],
          actualType: typeof actual[key]
        }))
      });
    } else {
      DebugUtils.info(this.CONTEXT, `Data structures match [${context}]`);
    }
  }
}