
import { DebugUtils, loadDebugModule } from './debugUtils';
import { testAuthFixes, verifyAuthInitializedFlag } from './authFixesTest';

// Re-export the main debug utility
export { DebugUtils, loadDebugModule };

// Export specialized debug utilities for different parts of the application
export const AppointmentDebug = {
  analyzeAppointment: DebugUtils.analyzeAppointment.bind(DebugUtils),
  visualizeAppointment: DebugUtils.visualizeAppointment.bind(DebugUtils),
  visualizeAppointmentBlock: DebugUtils.visualizeAppointmentBlock.bind(DebugUtils),
  trackTimezoneConversion: DebugUtils.trackTimezoneConversion.bind(DebugUtils),
  checkForDSTTransition: (utcStart: any, utcEnd: any, timezone: string) =>
    DebugUtils.VERBOSE ? false : false, // Private method, exposed as a stub
};

export const CalendarDebug = {
  logHookParameterMismatch: DebugUtils.logHookParameterMismatch.bind(DebugUtils),
  validateHookParameters: DebugUtils.validateHookParameters.bind(DebugUtils),
  visualizeAvailabilityBlock: DebugUtils.visualizeAvailabilityBlock.bind(DebugUtils),
  compareDataStructures: DebugUtils.compareDataStructures.bind(DebugUtils),
};

export const AuthDebug = {
  log: (message: string, data?: any) => DebugUtils.log('AuthDebug', message, data),
  error: (message: string, error?: any) => DebugUtils.error('AuthDebug', message, error),
  warn: (message: string, data?: any) => DebugUtils.warn('AuthDebug', message, data),
  info: (message: string, data?: any) => DebugUtils.info('AuthDebug', message, data),
  compareDataStructures: (expected: any, actual: any) =>
    DebugUtils.compareDataStructures('AuthDebug', expected, actual),
  // Add authentication fixes test functions
  testAuthFixes,
  verifyAuthInitializedFlag
};

// Helper to conditionally enable debug features based on environment
export const isDebugEnabled = import.meta.env.MODE === 'development';

// Helper to conditionally log based on environment
export function debugLog(context: string, message: string, data?: any): void {
  if (isDebugEnabled) {
    DebugUtils.log(context, message, data);
  }
}
