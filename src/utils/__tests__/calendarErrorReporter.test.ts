import { 
  CalendarErrorReporter, 
  ErrorSeverity, 
  ErrorContextData, 
  RecoveryOptions 
} from '../calendarErrorReporter';
import { CalendarDebugUtils } from '../calendarDebugUtils';

// Mock CalendarDebugUtils
jest.mock('../calendarDebugUtils', () => ({
  CalendarDebugUtils: {
    error: jest.fn(),
    log: jest.fn()
  }
}));

// Mock import.meta.env
jest.mock('../calendarErrorReporter', () => {
  // Save the original module
  const originalModule = jest.requireActual('../calendarErrorReporter');
  
  return {
    ...originalModule,
    // Override the module's internal import.meta reference
    // This is a workaround since we can't directly modify import.meta.env
  };
});

// Mock console.log for monitoring service
const originalConsoleLog = console.log;
console.log = jest.fn();

describe('CalendarErrorReporter', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    // Restore original console.log
    console.log = originalConsoleLog;
  });

  describe('reportError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      const context: ErrorContextData = {
        componentName: 'TestComponent',
        operation: 'testOperation'
      };
      
      CalendarErrorReporter.reportError(error, context, ErrorSeverity.MEDIUM);
      
      expect(CalendarDebugUtils.error).toHaveBeenCalledWith(
        'TestComponent',
        '[MEDIUM] Calendar error: Test error',
        expect.objectContaining({
          error,
          context: expect.objectContaining({
            componentName: 'TestComponent',
            operation: 'testOperation',
            timestamp: expect.any(String)
          })
        })
      );
    });
    
    it('should add timestamp if not provided', () => {
      const error = new Error('Test error');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      CalendarErrorReporter.reportError(error, context);
      
      const calledContext = (CalendarDebugUtils.error as jest.Mock).mock.calls[0][2].context;
      expect(calledContext.timestamp).toBeDefined();
    });
    
    it('should use provided timestamp if available', () => {
      const error = new Error('Test error');
      const timestamp = '2025-05-15T10:30:00Z';
      const context: ErrorContextData = {
        componentName: 'TestComponent',
        timestamp
      };
      
      CalendarErrorReporter.reportError(error, context);
      
      const calledContext = (CalendarDebugUtils.error as jest.Mock).mock.calls[0][2].context;
      expect(calledContext.timestamp).toBe(timestamp);
    });
    
    it('should use default severity if not provided', () => {
      const error = new Error('Test error');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      CalendarErrorReporter.reportError(error, context);
      
      expect(CalendarDebugUtils.error).toHaveBeenCalledWith(
        'TestComponent',
        '[MEDIUM] Calendar error: Test error',
        expect.anything()
      );
    });
    
    // Skip the production environment test since we can't easily mock import.meta.env
    it('should not send to monitoring service in development', () => {
      // We're assuming we're in development by default
      const error = new Error('Test error');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      CalendarErrorReporter.reportError(error, context);
      
      // In development, sendToMonitoringService shouldn't be called
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('getRecoveryOptions', () => {
    it('should return default recovery options', () => {
      const error = new Error('Generic error');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      const options = CalendarErrorReporter.getRecoveryOptions(error, context);
      
      expect(options).toEqual({
        canRetry: true,
        canReset: true,
        canRefresh: true,
        canIgnore: false,
        suggestedAction: 'retry',
        recoveryMessage: 'Please try again. If the problem persists, contact support.'
      });
    });
    
    it('should customize options for network errors', () => {
      const error = new Error('A network error occurred');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      const options = CalendarErrorReporter.getRecoveryOptions(error, context);
      
      expect(options.suggestedAction).toBe('retry');
      expect(options.recoveryMessage).toContain('Network issue');
    });
    
    it('should customize options for permission errors', () => {
      const error = new Error('User is unauthorized');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      const options = CalendarErrorReporter.getRecoveryOptions(error, context);
      
      expect(options.canRetry).toBe(false);
      expect(options.canReset).toBe(false);
      expect(options.suggestedAction).toBe('refresh');
      expect(options.recoveryMessage).toContain('Permission issue');
    });
    
    it('should customize options for data format errors', () => {
      const error = new Error('Invalid data format');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      const options = CalendarErrorReporter.getRecoveryOptions(error, context);
      
      expect(options.suggestedAction).toBe('reset');
      expect(options.recoveryMessage).toContain('Data format issue');
    });
    
    it('should customize options for critical errors', () => {
      const error = new Error('A critical error occurred');
      const context: ErrorContextData = {
        componentName: 'TestComponent',
        operation: 'render'
      };
      
      const options = CalendarErrorReporter.getRecoveryOptions(error, context);
      
      expect(options.canIgnore).toBe(false);
      expect(options.suggestedAction).toBe('contact-support');
      expect(options.recoveryMessage).toContain('critical error');
    });
  });

  describe('formatUserErrorMessage', () => {
    it('should return generic message for unknown context', () => {
      const error = new Error('Test error');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      const message = CalendarErrorReporter.formatUserErrorMessage(error, context);
      
      expect(message).toBe('An error occurred while loading the calendar.');
    });
    
    it('should customize message based on operation', () => {
      const error = new Error('Test error');
      const context: ErrorContextData = {
        componentName: 'TestComponent',
        operation: 'useWeekViewData'
      };
      
      const message = CalendarErrorReporter.formatUserErrorMessage(error, context);
      
      expect(message).toBe('An error occurred while loading calendar data.');
    });
    
    it('should add network-specific information', () => {
      const error = new Error('Network error');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      const message = CalendarErrorReporter.formatUserErrorMessage(error, context);
      
      expect(message).toContain('Please check your internet connection');
    });
    
    it('should add permission-specific information', () => {
      const error = new Error('Permission denied');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      const message = CalendarErrorReporter.formatUserErrorMessage(error, context);
      
      expect(message).toContain('You may not have permission');
    });
    
    it('should add not-found-specific information', () => {
      const error = new Error('Resource not found');
      const context: ErrorContextData = {
        componentName: 'TestComponent'
      };
      
      const message = CalendarErrorReporter.formatUserErrorMessage(error, context);
      
      expect(message).toContain('could not be found');
    });
  });

  describe('logDiagnostics', () => {
    it('should log diagnostic information', () => {
      const componentName = 'TestComponent';
      const data = { key1: 'value1', key2: 42 };
      
      CalendarErrorReporter.logDiagnostics(componentName, data);
      
      expect(CalendarDebugUtils.log).toHaveBeenCalledWith(
        componentName,
        'Diagnostics',
        expect.objectContaining({
          timestamp: expect.any(String),
          key1: 'value1',
          key2: 42
        })
      );
    });
  });

  describe('isRecoverableError', () => {
    it('should identify network errors as recoverable', () => {
      const networkError = new Error('Network timeout');
      expect(CalendarErrorReporter.isRecoverableError(networkError)).toBe(true);
      
      const connectionError = new Error('Connection failed');
      expect(CalendarErrorReporter.isRecoverableError(connectionError)).toBe(true);
    });
    
    it('should identify permission errors as non-recoverable', () => {
      const permissionError = new Error('Permission denied');
      expect(CalendarErrorReporter.isRecoverableError(permissionError)).toBe(false);
      
      const unauthorizedError = new Error('User is unauthorized');
      expect(CalendarErrorReporter.isRecoverableError(unauthorizedError)).toBe(false);
      
      const forbiddenError = new Error('Access forbidden');
      expect(CalendarErrorReporter.isRecoverableError(forbiddenError)).toBe(false);
    });
    
    it('should identify data format errors as recoverable', () => {
      const dataError = new Error('Invalid data');
      expect(CalendarErrorReporter.isRecoverableError(dataError)).toBe(true);
      
      const formatError = new Error('Invalid format');
      expect(CalendarErrorReporter.isRecoverableError(formatError)).toBe(true);
      
      const parseError = new Error('Failed to parse');
      expect(CalendarErrorReporter.isRecoverableError(parseError)).toBe(true);
    });
    
    it('should treat unknown errors as recoverable by default', () => {
      const unknownError = new Error('Some unknown error');
      expect(CalendarErrorReporter.isRecoverableError(unknownError)).toBe(true);
    });
  });
});