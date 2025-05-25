import { CalendarDebugUtils } from './calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'ErrorRecoveryUtils';

/**
 * Error Severity Enum
 * Defines the severity levels for errors
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error Category Enum
 * Defines the categories of errors
 */
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  DATA = 'data',
  VALIDATION = 'validation',
  RENDERING = 'rendering',
  STATE = 'state',
  UNKNOWN = 'unknown'
}

/**
 * Error Context Interface
 * Defines the context for an error
 */
export interface ErrorContext {
  componentName: string;
  operation: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  retryCount?: number;
  maxRetries?: number;
  timestamp?: number;
  additionalData?: any;
}

/**
 * Recovery Strategy Enum
 * Defines the strategies for recovering from errors
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  RESET = 'reset',
  NOTIFY = 'notify',
  IGNORE = 'ignore'
}

/**
 * Recovery Options Interface
 * Defines the options for error recovery
 */
export interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  fallbackData?: any;
  resetState?: boolean;
  notifyUser?: boolean;
  logError?: boolean;
}

/**
 * Default recovery options
 */
const DEFAULT_RECOVERY_OPTIONS: RecoveryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  resetState: false,
  notifyUser: true,
  logError: true
};

/**
 * Categorize an error based on its type and message
 * @param error The error to categorize
 * @returns The error category
 */
export function categorizeError(error: Error): ErrorCategory {
  if (!error) return ErrorCategory.UNKNOWN;
  
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  
  // Network errors
  if (
    errorName.includes('network') ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('timeout')
  ) {
    return ErrorCategory.NETWORK;
  }
  
  // API errors
  if (
    errorName.includes('api') ||
    errorMessage.includes('api') ||
    errorMessage.includes('status') ||
    errorMessage.includes('response') ||
    errorMessage.includes('request')
  ) {
    return ErrorCategory.API;
  }
  
  // Data errors
  if (
    errorName.includes('data') ||
    errorMessage.includes('data') ||
    errorMessage.includes('parse') ||
    errorMessage.includes('json') ||
    errorMessage.includes('format')
  ) {
    return ErrorCategory.DATA;
  }
  
  // Validation errors
  if (
    errorName.includes('validation') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('schema') ||
    errorMessage.includes('type')
  ) {
    return ErrorCategory.VALIDATION;
  }
  
  // Rendering errors
  if (
    errorName.includes('render') ||
    errorMessage.includes('render') ||
    errorMessage.includes('component') ||
    errorMessage.includes('element') ||
    errorMessage.includes('react')
  ) {
    return ErrorCategory.RENDERING;
  }
  
  // State errors
  if (
    errorName.includes('state') ||
    errorMessage.includes('state') ||
    errorMessage.includes('context') ||
    errorMessage.includes('redux') ||
    errorMessage.includes('store')
  ) {
    return ErrorCategory.STATE;
  }
  
  // Default to unknown
  return ErrorCategory.UNKNOWN;
}

/**
 * Determine the severity of an error based on its category and context
 * @param error The error to evaluate
 * @param context The error context
 * @returns The error severity
 */
export function determineSeverity(error: Error, context?: ErrorContext): ErrorSeverity {
  const category = context?.category || categorizeError(error);
  
  // Network errors are usually medium severity
  if (category === ErrorCategory.NETWORK) {
    return ErrorSeverity.MEDIUM;
  }
  
  // API errors can be high severity
  if (category === ErrorCategory.API) {
    return ErrorSeverity.HIGH;
  }
  
  // Data errors are usually medium severity
  if (category === ErrorCategory.DATA) {
    return ErrorSeverity.MEDIUM;
  }
  
  // Validation errors are usually low severity
  if (category === ErrorCategory.VALIDATION) {
    return ErrorSeverity.LOW;
  }
  
  // Rendering errors are usually high severity
  if (category === ErrorCategory.RENDERING) {
    return ErrorSeverity.HIGH;
  }
  
  // State errors can be critical
  if (category === ErrorCategory.STATE) {
    return ErrorSeverity.CRITICAL;
  }
  
  // Default to medium severity
  return ErrorSeverity.MEDIUM;
}

/**
 * Determine the best recovery strategy for an error
 * @param error The error to recover from
 * @param context The error context
 * @returns The recovery strategy
 */
export function determineRecoveryStrategy(error: Error, context?: ErrorContext): RecoveryStrategy {
  const category = context?.category || categorizeError(error);
  const severity = context?.severity || determineSeverity(error, context);
  const retryCount = context?.retryCount || 0;
  const maxRetries = context?.maxRetries || DEFAULT_RECOVERY_OPTIONS.maxRetries;
  
  // If we've exceeded the maximum retries, use a fallback
  if (retryCount >= maxRetries!) {
    return RecoveryStrategy.FALLBACK;
  }
  
  // Network errors can usually be retried
  if (category === ErrorCategory.NETWORK) {
    return RecoveryStrategy.RETRY;
  }
  
  // API errors can sometimes be retried
  if (category === ErrorCategory.API) {
    // For high severity API errors, notify the user
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      return RecoveryStrategy.NOTIFY;
    }
    
    return RecoveryStrategy.RETRY;
  }
  
  // Data errors might need a fallback
  if (category === ErrorCategory.DATA) {
    return RecoveryStrategy.FALLBACK;
  }
  
  // Validation errors usually need a reset
  if (category === ErrorCategory.VALIDATION) {
    return RecoveryStrategy.RESET;
  }
  
  // Rendering errors usually need a reset
  if (category === ErrorCategory.RENDERING) {
    return RecoveryStrategy.RESET;
  }
  
  // State errors usually need a reset
  if (category === ErrorCategory.STATE) {
    return RecoveryStrategy.RESET;
  }
  
  // Default to notifying the user
  return RecoveryStrategy.NOTIFY;
}

/**
 * Calculate the retry delay with exponential backoff
 * @param retryCount The current retry count
 * @param baseDelay The base delay in milliseconds
 * @returns The retry delay in milliseconds
 */
export function calculateRetryDelay(retryCount: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, retryCount);
}

/**
 * Retry a function with exponential backoff
 * @param fn The function to retry
 * @param options The retry options
 * @returns A promise that resolves with the function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RecoveryOptions = {}
): Promise<T> {
  const mergedOptions = { ...DEFAULT_RECOVERY_OPTIONS, ...options };
  const { maxRetries, retryDelay, exponentialBackoff, logError } = mergedOptions;
  
  let retryCount = 0;
  let lastError: Error | null = null;
  
  while (retryCount <= maxRetries!) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (logError) {
        CalendarDebugUtils.error(COMPONENT_NAME, `Retry attempt ${retryCount} failed`, {
          error: lastError,
          retryCount,
          maxRetries
        });
      }
      
      retryCount++;
      
      if (retryCount > maxRetries!) {
        break;
      }
      
      // Calculate the delay for this retry
      const delay = exponentialBackoff
        ? calculateRetryDelay(retryCount, retryDelay!)
        : retryDelay!;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Create a snapshot of the current state
 * @param state The state to snapshot
 * @returns A deep copy of the state
 */
export function createStateSnapshot<T>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Restore state from a snapshot
 * @param snapshot The snapshot to restore from
 * @param setState The setState function
 */
export function restoreStateFromSnapshot<T>(snapshot: T, setState: (state: T) => void): void {
  setState(snapshot);
}

/**
 * Error recovery utility
 * Provides methods for recovering from errors
 */
export class ErrorRecovery {
  private static stateSnapshots = new Map<string, any>();
  
  /**
   * Create a snapshot of the current state
   * @param key The key to store the snapshot under
   * @param state The state to snapshot
   */
  public static createSnapshot(key: string, state: any): void {
    this.stateSnapshots.set(key, createStateSnapshot(state));
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'State snapshot created', {
      key,
      state
    });
  }
  
  /**
   * Restore state from a snapshot
   * @param key The key of the snapshot to restore
   * @returns The restored state or null if no snapshot exists
   */
  public static restoreSnapshot(key: string): any {
    const snapshot = this.stateSnapshots.get(key);
    
    if (snapshot) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'State snapshot restored', {
        key,
        snapshot
      });
    } else {
      CalendarDebugUtils.warn(COMPONENT_NAME, 'No state snapshot found', {
        key
      });
    }
    
    return snapshot || null;
  }
  
  /**
   * Clear a snapshot
   * @param key The key of the snapshot to clear
   */
  public static clearSnapshot(key: string): void {
    this.stateSnapshots.delete(key);
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'State snapshot cleared', {
      key
    });
  }
  
  /**
   * Recover from an error
   * @param error The error to recover from
   * @param context The error context
   * @param options The recovery options
   * @returns The recovery result
   */
  public static async recover<T>(
    error: Error,
    context: ErrorContext,
    options: RecoveryOptions = {}
  ): Promise<T | null> {
    const mergedOptions = { ...DEFAULT_RECOVERY_OPTIONS, ...options };
    const { fallbackData, resetState, notifyUser, logError } = mergedOptions;
    
    // Categorize the error if not already categorized
    if (!context.category) {
      context.category = categorizeError(error);
    }
    
    // Determine the severity if not already determined
    if (!context.severity) {
      context.severity = determineSeverity(error, context);
    }
    
    // Add timestamp if not present
    if (!context.timestamp) {
      context.timestamp = Date.now();
    }
    
    // Determine the recovery strategy
    const strategy = determineRecoveryStrategy(error, context);
    
    if (logError) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Recovering from error', {
        error,
        context,
        strategy,
        options: mergedOptions
      });
    }
    
    // Execute the recovery strategy
    switch (strategy) {
      case RecoveryStrategy.RETRY:
        // Retry the operation
        if (context.retryCount === undefined) {
          context.retryCount = 0;
        }
        
        context.retryCount++;
        
        if (notifyUser) {
          // Notify the user that we're retrying
          console.log(`Retrying operation (${context.retryCount}/${mergedOptions.maxRetries})...`);
        }
        
        return null;
        
      case RecoveryStrategy.FALLBACK:
        // Use fallback data
        if (notifyUser) {
          // Notify the user that we're using fallback data
          console.log('Using fallback data...');
        }
        
        return fallbackData as T;
        
      case RecoveryStrategy.RESET:
        // Reset the state
        if (resetState) {
          // Restore from snapshot if available
          const snapshot = this.restoreSnapshot(context.componentName);
          
          if (snapshot) {
            if (notifyUser) {
              // Notify the user that we're resetting the state
              console.log('Resetting state...');
            }
            
            return snapshot as T;
          }
        }
        
        return null;
        
      case RecoveryStrategy.NOTIFY:
        // Notify the user
        if (notifyUser) {
          // Notify the user about the error
          console.error('An error occurred:', error.message);
        }
        
        return null;
        
      case RecoveryStrategy.IGNORE:
        // Ignore the error
        return null;
        
      default:
        return null;
    }
  }
}

export default ErrorRecovery;