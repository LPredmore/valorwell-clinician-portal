import { CalendarDebugUtils } from './calendarDebugUtils';

/**
 * Error severity levels for calendar errors
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Interface for error context data
 */
export interface ErrorContextData {
  componentName: string;
  operation?: string;
  userId?: string;
  clinicianId?: string;
  appointmentId?: string;
  timeZone?: string;
  additionalData?: Record<string, any>;
  timestamp?: string;
  // Calendar-specific context properties
  daysCount?: number;
  appointmentsCount?: number;
  timeSlotsCount?: number;
  weekDaysCount?: number;
  day?: string;
  // Allow any additional properties
  [key: string]: any;
}

/**
 * Interface for recovery options
 */
export interface RecoveryOptions {
  canRetry: boolean;
  canReset: boolean;
  canRefresh: boolean;
  canIgnore: boolean;
  suggestedAction: 'retry' | 'reset' | 'refresh' | 'ignore' | 'contact-support';
  recoveryMessage?: string;
}

/**
 * Calendar Error Reporter - Centralized error reporting and recovery for calendar components
 * This utility provides structured error reporting, logging, and recovery suggestions
 */
export class CalendarErrorReporter {
  /**
   * Report a calendar error with detailed context
   */
  public static reportError(
    error: Error,
    context: ErrorContextData,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): void {
    // Ensure timestamp is included
    const contextWithTimestamp = {
      ...context,
      timestamp: context.timestamp || new Date().toISOString()
    };

    // Log the error with detailed context
    CalendarDebugUtils.error(
      context.componentName,
      `[${severity.toUpperCase()}] Calendar error: ${error.message}`,
      {
        error,
        context: contextWithTimestamp
      }
    );

    // In a production environment, this would send the error to a monitoring service
    if (import.meta.env.PROD) {
      this.sendToMonitoringService(error, contextWithTimestamp, severity);
    }
  }

  /**
   * Get recovery options for a specific error
   */
  public static getRecoveryOptions(
    error: Error,
    context: ErrorContextData
  ): RecoveryOptions {
    // Default recovery options
    const defaultOptions: RecoveryOptions = {
      canRetry: true,
      canReset: true,
      canRefresh: true,
      canIgnore: false,
      suggestedAction: 'retry',
      recoveryMessage: 'Please try again. If the problem persists, contact support.'
    };

    // Customize recovery options based on error type and context
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return {
        ...defaultOptions,
        suggestedAction: 'retry',
        recoveryMessage: 'Network issue detected. Please check your connection and try again.'
      };
    }

    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return {
        ...defaultOptions,
        canRetry: false,
        canReset: false,
        suggestedAction: 'refresh',
        recoveryMessage: 'Permission issue detected. Please refresh the page or log in again.'
      };
    }

    if (error.message.includes('data') || error.message.includes('format')) {
      return {
        ...defaultOptions,
        suggestedAction: 'reset',
        recoveryMessage: 'Data format issue detected. Resetting the view may resolve this problem.'
      };
    }

    // For critical errors, suggest contacting support
    if (context.operation === 'render' || error.message.includes('critical')) {
      return {
        ...defaultOptions,
        canIgnore: false,
        suggestedAction: 'contact-support',
        recoveryMessage: 'A critical error has occurred. Please contact support for assistance.'
      };
    }

    return defaultOptions;
  }

  /**
   * Format an error message for user display
   */
  public static formatUserErrorMessage(
    error: Error,
    context: ErrorContextData
  ): string {
    // Start with a generic message
    let message = 'An error occurred while loading the calendar.';

    // Customize based on context and error type
    if (context.operation === 'useWeekViewData') {
      message = 'An error occurred while loading calendar data.';
    } else if (context.operation === 'handleAppointmentClick') {
      message = 'An error occurred while opening the appointment details.';
    } else if (context.operation === 'handleAppointmentDrop') {
      message = 'An error occurred while updating the appointment time.';
    } else if (context.operation === 'handleAvailabilityBlockClick') {
      message = 'An error occurred while selecting the availability block.';
    } else if (context.operation === 'render') {
      message = 'An error occurred while displaying the calendar.';
    }

    // Add more specific information for certain error types
    if (error.message.includes('network')) {
      message += ' Please check your internet connection.';
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      message += ' You may not have permission to view this information.';
    } else if (error.message.includes('not found')) {
      message += ' The requested information could not be found.';
    }

    return message;
  }

  /**
   * Send error to a monitoring service (mock implementation)
   * In a real application, this would send the error to a service like Sentry, LogRocket, etc.
   */
  private static sendToMonitoringService(
    error: Error,
    context: ErrorContextData,
    severity: ErrorSeverity
  ): void {
    // This is a mock implementation
    console.log(`[MONITORING] Sending error to monitoring service:`, {
      error: error.message,
      stack: error.stack,
      context,
      severity
    });

    // In a real implementation, this would use an API client to send the error
    // Example:
    // monitoringClient.captureException(error, {
    //   level: severity,
    //   tags: {
    //     component: context.componentName,
    //     operation: context.operation
    //   },
    //   extra: context
    // });
  }

  /**
   * Log diagnostic information for troubleshooting
   */
  public static logDiagnostics(componentName: string, data: Record<string, any>): void {
    CalendarDebugUtils.log(componentName, 'Diagnostics', {
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Check if an error is recoverable
   */
  public static isRecoverableError(error: Error): boolean {
    // Network errors are typically recoverable
    if (
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('connection')
    ) {
      return true;
    }

    // Permission errors may require a refresh or re-login
    if (
      error.message.includes('permission') ||
      error.message.includes('unauthorized') ||
      error.message.includes('forbidden')
    ) {
      return false;
    }

    // Data format errors may be recoverable with a reset
    if (
      error.message.includes('data') ||
      error.message.includes('format') ||
      error.message.includes('parse')
    ) {
      return true;
    }

    // By default, assume the error is recoverable
    return true;
  }
}