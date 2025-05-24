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
  
  // Enable/disable logging for specific components
  private static _enabledComponents: Record<string, boolean> = {
    'Calendar': true,
    'WeekView': true,
    'useWeekViewData': true,
    'useAppointments': true,
    'TimeSlot': false,
    'CalendarView': false
  };

  // Log levels
  public static readonly LOG_LEVELS = {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
    TRACE: 5
  };

  // Current log level - can be changed at runtime
  private static _logLevel: number =
    import.meta.env.MODE === 'development' ? CalendarDebugUtils.LOG_LEVELS.DEBUG : CalendarDebugUtils.LOG_LEVELS.ERROR;

  /**
   * Enable or disable logging for a specific component
   */
  public static enableComponent(componentName: string, enabled: boolean): void {
    this._enabledComponents[componentName] = enabled;
    DebugUtils.info(this.CONTEXT, `${componentName} logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if logging is enabled for a component
   */
  public static isComponentEnabled(componentName: string): boolean {
    return this._enabledComponents[componentName] ?? false;
  }

  /**
   * Set the global log level
   */
  public static setLogLevel(level: number): void {
    this._logLevel = level;
    DebugUtils.info(this.CONTEXT, `Log level set to ${level}`);
  }

  /**
   * Get the current log level
   */
  public static getLogLevel(): number {
    return this._logLevel;
  }

  /**
   * Log a message if the component is enabled and log level is sufficient
   */
  public static log(component: string, message: string, data?: any, level: number = CalendarDebugUtils.LOG_LEVELS.DEBUG): void {
    if (!this._enabledComponents[component] || level > this._logLevel) return;
    
    DebugUtils.log(`${this.CONTEXT}:${component}`, message, data);
  }

  /**
   * Log an error message (always enabled regardless of component settings)
   */
  public static error(component: string, message: string, error?: any): void {
    if (this._logLevel < CalendarDebugUtils.LOG_LEVELS.ERROR) return;
    
    DebugUtils.error(`${this.CONTEXT}:${component}`, message, error);
  }

  /**
   * Log a warning message if the component is enabled
   */
  public static warn(component: string, message: string, data?: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.WARN) return;
    
    DebugUtils.warn(`${this.CONTEXT}:${component}`, message, data);
  }

  /**
   * Log an info message if the component is enabled
   */
  public static info(component: string, message: string, data?: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.INFO) return;
    
    DebugUtils.info(`${this.CONTEXT}:${component}`, message, data);
  }

  /**
   * Log a trace message if the component is enabled and trace logging is enabled
   */
  public static trace(component: string, message: string, data?: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.TRACE) return;
    
    DebugUtils.log(`${this.CONTEXT}:${component} [TRACE]`, message, data);
  }

  /**
   * Log component lifecycle events
   */
  public static logLifecycle(component: string, event: string, props?: Record<string, any>): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.DEBUG) return;
    
    DebugUtils.info(`${this.CONTEXT}:${component}`, `Lifecycle: ${event}`, props);
  }

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
  /**
   * Log data loading events
   */
  public static logDataLoading(component: string, stage: string, data?: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.DEBUG) return;
    
    DebugUtils.log(`${this.CONTEXT}:${component}`, `Data Loading [${stage}]`, data);
  }

  /**
   * Log API request details
   */
  public static logApiRequest(component: string, endpoint: string, params?: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.DEBUG) return;
    
    DebugUtils.log(`${this.CONTEXT}:${component}`, `API Request to ${endpoint}`, params);
  }

  /**
   * Log API response details
   */
  public static logApiResponse(component: string, endpoint: string, success: boolean, data?: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.DEBUG) return;
    
    if (success) {
      DebugUtils.log(`${this.CONTEXT}:${component}`, `API Response from ${endpoint} (Success)`, data);
    } else {
      DebugUtils.error(`${this.CONTEXT}:${component}`, `API Response from ${endpoint} (Failed)`, data);
    }
  }

  /**
   * Log rendering details
   */
  public static logRendering(component: string, details?: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.TRACE) return;
    
    DebugUtils.log(`${this.CONTEXT}:${component}`, `Rendering`, details);
  }

  /**
   * Log state changes
   */
  public static logStateChange(component: string, stateName: string, oldValue: any, newValue: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.DEBUG) return;
    
    DebugUtils.log(`${this.CONTEXT}:${component}`, `State Change: ${stateName}`, {
      from: oldValue,
      to: newValue
    });
  }

  /**
   * Log performance metrics
   */
  public static logPerformance(component: string, operation: string, durationMs: number, details?: any): void {
    if (!this._enabledComponents[component] || this._logLevel < CalendarDebugUtils.LOG_LEVELS.INFO) return;
    
    DebugUtils.info(`${this.CONTEXT}:${component}`, `Performance [${operation}]: ${durationMs}ms`, details);
  }
}