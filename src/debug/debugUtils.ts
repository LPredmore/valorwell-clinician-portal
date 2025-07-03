
import { DateTime } from 'luxon';

interface TimeBlock {
  start: DateTime;
  end: DateTime;
  isException?: boolean;
}

interface AppointmentBlock {
  id: string;
  start: DateTime;
  end: DateTime;
  clientName?: string;
}

/**
 * Core debug utility class with common logging and visualization functions
 */
export class DebugUtils {
  public static readonly VERBOSE = import.meta.env.MODE === 'development';
  
  /**
   * Log with context
   */
  public static log(context: string, message: string, data?: any): void {
    if (!this.VERBOSE) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[${context}] [${timestamp}] ${message}`);
    
    if (data !== undefined) {
      if (typeof data === 'object') {
        console.table(data);
      } else {
        console.log(data);
      }
    }
  }
  
  /**
   * Log errors with context
   */
  public static error(context: string, message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[${context}] [${timestamp}] ${message}`);
    
    if (error) {
      console.error(error);
    }
  }
  
  /**
   * Log warnings with context
   */
  public static warn(context: string, message: string, data?: any): void {
    if (!this.VERBOSE) return;
    
    const timestamp = new Date().toISOString();
    console.warn(`[${context}] [${timestamp}] ${message}`);
    
    if (data !== undefined) {
      console.warn(data);
    }
  }
  
  /**
   * Log info with context
   */
  public static info(context: string, message: string, data?: any): void {
    if (!this.VERBOSE) return;
    
    const timestamp = new Date().toISOString();
    console.info(`[${context}] [${timestamp}] ${message}`);
    
    if (data !== undefined) {
      console.info(data);
    }
  }
  
  /**
   * Analyze appointment for debugging
   */
  public static analyzeAppointment(appointment: any, userTimeZone?: string): void {
    if (!this.VERBOSE) return;
    
    this.log('AppointmentAnalysis', 'Analyzing appointment', {
      id: appointment?.id,
      start: appointment?.start_at,
      end: appointment?.end_at,
      clientName: appointment?.clientName,
      timezone: userTimeZone
    });
  }
  
  /**
   * Visualize appointment for debugging
   */
  public static visualizeAppointment(appointment: any, userTimeZone?: string): void {
    if (!this.VERBOSE) return;
    
    this.log('AppointmentVisualization', 'Visualizing appointment', {
      appointment,
      userTimeZone
    });
  }
  
  /**
   * Visualize appointment block for debugging
   */
  public static visualizeAppointmentBlock(block: any): void {
    if (!this.VERBOSE) return;
    
    this.log('AppointmentBlockVisualization', 'Visualizing appointment block', block);
  }
  
  /**
   * Track timezone conversion
   */
  public static trackTimezoneConversion(fromTime: any, toTime: any, timezone: string): void {
    if (!this.VERBOSE) return;
    
    this.log('TimezoneConversion', 'Tracking timezone conversion', {
      fromTime,
      toTime,
      timezone,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log hook parameter mismatch
   */
  public static logHookParameterMismatch(hookName: string, expected: any, actual: any): void {
    this.warn('HookParameterMismatch', `${hookName} parameter mismatch`, {
      expected,
      actual
    });
  }
  
  /**
   * Validate hook parameters
   */
  public static validateHookParameters(hookName: string, params: any): boolean {
    if (!this.VERBOSE) return true;
    
    this.log('HookValidation', `Validating ${hookName} parameters`, params);
    return true;
  }
  
  /**
   * Visualize availability block
   */
  public static visualizeAvailabilityBlock(block: any): void {
    if (!this.VERBOSE) return;
    
    this.log('AvailabilityBlockVisualization', 'Visualizing availability block', block);
  }
  
  /**
   * Compare data structures
   */
  public static compareDataStructures(context: string, expected: any, actual: any): void {
    if (!this.VERBOSE) return;
    
    this.log('DataStructureComparison', `${context} - Data structure comparison`, {
      expected,
      actual,
      match: JSON.stringify(expected) === JSON.stringify(actual)
    });
  }
}

/**
 * Conditionally load debug module
 */
export const loadDebugModule = async (moduleLoader: () => Promise<any>) => {
  if (import.meta.env.MODE === 'development') {
    try {
      return await moduleLoader();
    } catch (error) {
      console.warn('Failed to load debug module:', error);
      return null;
    }
  }
  return null;
};

export const debugTimeCalculations = (
  appointmentBlocks: AppointmentBlock[],
  timeBlocks: TimeBlock[],
  weekDays: DateTime[]
) => {
  console.log('[debugUtils] Time calculations debug:', {
    appointmentBlocksCount: appointmentBlocks.length,
    timeBlocksCount: timeBlocks.length,
    weekDaysCount: weekDays.length,
    appointmentSample: appointmentBlocks.slice(0, 3),
    timeBlockSample: timeBlocks.slice(0, 3)
  });
};
