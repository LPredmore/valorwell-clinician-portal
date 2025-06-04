
import { DebugUtils } from './debugUtils';

/**
 * Specialized debug utility for Block Time operations
 */
export class BlockTimeDebug {
  private static readonly CONTEXT = 'BlockTimeDebug';
  
  /**
   * Log block time operation with detailed context
   */
  public static logOperation(operation: string, data?: any, isError: boolean = false): void {
    const timestamp = new Date().toISOString();
    const prefix = isError ? '❌ [BLOCK TIME ERROR]' : '🔍 [BLOCK TIME]';
    
    console.log(`${prefix} [${timestamp}] ${operation}`);
    
    if (data !== undefined) {
      if (typeof data === 'object') {
        console.table(data);
      } else {
        console.log(data);
      }
    }
  }
  
  /**
   * Log database operation with query details
   */
  public static logDatabaseOperation(
    table: string, 
    operation: string, 
    data?: any, 
    result?: any, 
    error?: any
  ): void {
    const operationData = {
      table,
      operation,
      data,
      result,
      error: error ? {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      } : null,
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      this.logOperation(`Database ${operation} failed on ${table}`, operationData, true);
    } else {
      this.logOperation(`Database ${operation} succeeded on ${table}`, operationData);
    }
  }
  
  /**
   * Log validation results
   */
  public static logValidation(field: string, value: any, isValid: boolean, errorMessage?: string): void {
    const validationData = {
      field,
      value,
      isValid,
      errorMessage,
      timestamp: new Date().toISOString()
    };
    
    if (!isValid) {
      this.logOperation(`Validation failed for ${field}`, validationData, true);
    } else {
      this.logOperation(`Validation passed for ${field}`, validationData);
    }
  }
  
  /**
   * Log timezone conversion details
   */
  public static logTimezoneOperation(
    fromTime: string | Date,
    timezone: string,
    result: string,
    operation: string
  ): void {
    const timezoneData = {
      operation,
      fromTime: fromTime instanceof Date ? fromTime.toISOString() : fromTime,
      timezone,
      result,
      timestamp: new Date().toISOString()
    };
    
    this.logOperation(`Timezone ${operation}`, timezoneData);
  }
  
  /**
   * Log form state for debugging
   */
  public static logFormState(formData: {
    selectedDate?: Date;
    startTime: string;
    endTime: string;
    blockLabel: string;
    notes: string;
    selectedClinicianId?: string | null;
  }): void {
    const formState = {
      ...formData,
      selectedDate: formData.selectedDate?.toISOString(),
      isValidDateRange: formData.startTime < formData.endTime,
      hasRequiredFields: !!(formData.selectedDate && formData.selectedClinicianId),
      timestamp: new Date().toISOString()
    };
    
    this.logOperation('Form state snapshot', formState);
  }
  
  /**
   * Create a debug report for troubleshooting
   */
  public static createDebugReport(context: string, error: any, additionalData?: any): string {
    const report = {
      context,
      timestamp: new Date().toISOString(),
      error: {
        message: error?.message || 'Unknown error',
        code: error?.code,
        hint: error?.hint,
        details: error?.details,
        stack: error?.stack
      },
      additionalData,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.logOperation('Debug report generated', report, true);
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Test database connectivity for block time operations
   */
  public static async testDatabaseConnectivity(): Promise<void> {
    try {
      this.logOperation('Testing database connectivity');
      
      // This will be implemented when we need to test specific queries
      this.logOperation('Database connectivity test completed');
    } catch (error) {
      this.logOperation('Database connectivity test failed', error, true);
    }
  }
}
