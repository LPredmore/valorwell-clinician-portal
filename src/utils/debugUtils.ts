import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { TimeBlock, AppointmentBlock } from '@/components/calendar/week-view/types';

/**
 * Debug utility for calendar components
 * Provides structured logging and data visualization for debugging
 */
export class DebugUtils {
  private static readonly PREFIX = '🔍 [DEBUG]';
  private static readonly ERROR_PREFIX = '❌ [ERROR]';
  private static readonly WARNING_PREFIX = '⚠️ [WARNING]';
  private static readonly INFO_PREFIX = '📝 [INFO]';
  
  /**
   * Enable or disable detailed debug logging
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
   * Compare expected vs actual data structures
   */
  public static compareDataStructures(context: string, expected: any, actual: any): void {
    if (!this.VERBOSE) return;
    
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
}
