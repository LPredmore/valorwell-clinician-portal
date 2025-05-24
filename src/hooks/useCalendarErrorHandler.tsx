import { useState, useCallback } from 'react';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import {
  CalendarErrorReporter,
  ErrorSeverity,
  ErrorContextData
} from '@/utils/calendarErrorReporter';

interface ErrorHandlerOptions {
  componentName: string;
  onError?: (error: Error, context?: ErrorContextData) => void;
  recoveryAttempts?: number;
  userId?: string;
  clinicianId?: string;
}

// Re-export types from the error reporter for convenience
export type { ErrorContextData } from '@/utils/calendarErrorReporter';
export { ErrorSeverity } from '@/utils/calendarErrorReporter';

/**
 * Custom hook for handling errors in calendar components
 * Provides error tracking, logging, and recovery mechanisms
 */
export function useCalendarErrorHandler(options: ErrorHandlerOptions) {
  const { componentName, onError, recoveryAttempts = 3 } = options;
  
  const [error, setError] = useState<Error | null>(null);
  const [errorContext, setErrorContext] = useState<ErrorContextData | null>(null);
  const [recoveryCount, setRecoveryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  /**
   * Handle an error with detailed context information
   */
  const handleError = useCallback((error: Error, context?: Partial<ErrorContextData>) => {
    // Set the error state
    setError(error);
    
    // Create a complete context object
    const fullContext: ErrorContextData = {
      componentName,
      timestamp: new Date().toISOString(),
      userId: options.userId,
      clinicianId: options.clinicianId,
      ...context
    };
    
    // Set the error context
    setErrorContext(fullContext);
    
    // Determine error severity based on the error and context
    let severity = ErrorSeverity.MEDIUM;
    
    if (context?.operation === 'render' || error.message.includes('critical')) {
      severity = ErrorSeverity.HIGH;
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      severity = ErrorSeverity.MEDIUM;
    } else if (context?.operation?.includes('click') || context?.operation?.includes('drag')) {
      severity = ErrorSeverity.LOW;
    }
    
    // Report the error using the centralized reporter
    CalendarErrorReporter.reportError(error, fullContext, severity);
    
    // Log additional diagnostics
    CalendarErrorReporter.logDiagnostics(componentName, {
      errorMessage: error.message,
      recoveryAttempts: recoveryCount,
      isRecoverable: CalendarErrorReporter.isRecoverableError(error),
      ...context?.additionalData
    });
    
    // Call the onError callback if provided
    if (onError) {
      onError(error, fullContext);
    }
    
    return error;
  }, [componentName, options.userId, options.clinicianId, onError, recoveryCount]);

  /**
   * Attempt to recover from an error
   */
  const attemptRecovery = useCallback(() => {
    if (!error) return true;
    
    // Check if the error is recoverable
    const isRecoverable = CalendarErrorReporter.isRecoverableError(error);
    
    if (!isRecoverable) {
      CalendarDebugUtils.warn(componentName, 'Error is not recoverable', {
        error: error.message,
        context: errorContext
      });
      return false;
    }
    
    if (recoveryCount >= recoveryAttempts) {
      CalendarDebugUtils.warn(componentName, 'Maximum recovery attempts reached', {
        error,
        context: errorContext,
        maxAttempts: recoveryAttempts
      });
      return false;
    }
    
    setIsRecovering(true);
    setRecoveryCount(prev => prev + 1);
    
    CalendarDebugUtils.log(componentName, 'Attempting recovery', {
      attempt: recoveryCount + 1,
      maxAttempts: recoveryAttempts,
      error: error.message,
      context: errorContext
    });
    
    // Clear the error state
    setError(null);
    
    // Recovery is considered successful if we cleared the error
    setIsRecovering(false);
    return true;
  }, [error, errorContext, recoveryCount, recoveryAttempts, componentName]);

  /**
   * Reset the error state and recovery count
   */
  const resetErrorState = useCallback(() => {
    setError(null);
    setErrorContext(null);
    setRecoveryCount(0);
    setIsRecovering(false);
    
    CalendarDebugUtils.log(componentName, 'Error state reset');
  }, [componentName]);

  /**
   * Wrap a function with error handling
   */
  const withErrorHandling = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    context?: Partial<ErrorContextData>
  ) => {
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      try {
        return fn(...args);
      } catch (err) {
        handleError(err instanceof Error ? err : new Error(String(err)), {
          ...context,
          operation: context?.operation || fn.name || 'anonymous function',
          additionalData: {
            ...(context?.additionalData || {}),
            args: JSON.stringify(args)
          }
        });
        return undefined;
      }
    };
  }, [handleError]);

  /**
   * Get user-friendly error message and recovery options
   */
  const getUserErrorInfo = useCallback(() => {
    if (!error || !errorContext) return null;
    
    return {
      message: CalendarErrorReporter.formatUserErrorMessage(error, errorContext),
      recoveryOptions: CalendarErrorReporter.getRecoveryOptions(error, errorContext)
    };
  }, [error, errorContext]);

  return {
    error,
    errorContext,
    isRecovering,
    recoveryCount,
    handleError,
    attemptRecovery,
    resetErrorState,
    withErrorHandling,
    hasError: !!error,
    getUserErrorInfo
  };
}