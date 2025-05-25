import { CalendarDebugUtils } from '../calendarDebugUtils';
import { DebugUtils } from '../debugUtils';
import { DateTime } from 'luxon';

// Mock DebugUtils
jest.mock('../debugUtils', () => ({
  DebugUtils: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

// Mock console.error for hook parameter mismatch
const originalConsoleError = console.error;
console.error = jest.fn();

describe('CalendarDebugUtils', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });

  describe('Component logging control', () => {
    it('should enable and disable component logging', () => {
      // Enable a component that's not enabled by default
      CalendarDebugUtils.enableComponent('TestComponent', true);
      expect(CalendarDebugUtils.isComponentEnabled('TestComponent')).toBe(true);
      
      // Disable the component
      CalendarDebugUtils.enableComponent('TestComponent', false);
      expect(CalendarDebugUtils.isComponentEnabled('TestComponent')).toBe(false);
      
      // Check that DebugUtils.info was called for both operations
      expect(DebugUtils.info).toHaveBeenCalledTimes(2);
    });
    
    it('should return false for unknown components', () => {
      expect(CalendarDebugUtils.isComponentEnabled('UnknownComponent')).toBe(false);
    });
  });

  describe('Log level control', () => {
    it('should set and get log level', () => {
      const originalLevel = CalendarDebugUtils.getLogLevel();
      
      // Set a new log level
      CalendarDebugUtils.setLogLevel(CalendarDebugUtils.LOG_LEVELS.TRACE);
      expect(CalendarDebugUtils.getLogLevel()).toBe(CalendarDebugUtils.LOG_LEVELS.TRACE);
      
      // Restore original log level
      CalendarDebugUtils.setLogLevel(originalLevel);
    });
  });

  describe('Basic logging methods', () => {
    beforeEach(() => {
      // Enable test component and set log level to TRACE for testing
      CalendarDebugUtils.enableComponent('TestComponent', true);
      CalendarDebugUtils.setLogLevel(CalendarDebugUtils.LOG_LEVELS.TRACE);
    });
    
    it('should log messages', () => {
      CalendarDebugUtils.log('TestComponent', 'Test message', { data: 'test' });
      
      expect(DebugUtils.log).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'Test message',
        { data: 'test' }
      );
    });
    
    it('should log errors', () => {
      const error = new Error('Test error');
      CalendarDebugUtils.error('TestComponent', 'Error message', error);
      
      expect(DebugUtils.error).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'Error message',
        error
      );
    });
    
    it('should log warnings', () => {
      CalendarDebugUtils.warn('TestComponent', 'Warning message', { data: 'test' });
      
      expect(DebugUtils.warn).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'Warning message',
        { data: 'test' }
      );
    });
    
    it('should log info messages', () => {
      CalendarDebugUtils.info('TestComponent', 'Info message', { data: 'test' });
      
      expect(DebugUtils.info).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'Info message',
        { data: 'test' }
      );
    });
    
    it('should log trace messages', () => {
      CalendarDebugUtils.trace('TestComponent', 'Trace message', { data: 'test' });
      
      expect(DebugUtils.log).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent [TRACE]',
        'Trace message',
        { data: 'test' }
      );
    });
  });

  describe('Log filtering', () => {
    beforeEach(() => {
      // Set log level to INFO for testing
      CalendarDebugUtils.setLogLevel(CalendarDebugUtils.LOG_LEVELS.INFO);
      CalendarDebugUtils.enableComponent('TestComponent', true);
    });
    
    it('should not log messages below the current log level', () => {
      // DEBUG level message with INFO level set
      CalendarDebugUtils.log('TestComponent', 'Debug message');
      expect(DebugUtils.log).not.toHaveBeenCalled();
      
      // TRACE level message with INFO level set
      CalendarDebugUtils.trace('TestComponent', 'Trace message');
      expect(DebugUtils.log).not.toHaveBeenCalled();
    });
    
    it('should log messages at or above the current log level', () => {
      // ERROR level message with INFO level set
      CalendarDebugUtils.error('TestComponent', 'Error message');
      expect(DebugUtils.error).toHaveBeenCalled();
      
      // WARN level message with INFO level set
      CalendarDebugUtils.warn('TestComponent', 'Warning message');
      expect(DebugUtils.warn).toHaveBeenCalled();
      
      // INFO level message with INFO level set
      CalendarDebugUtils.info('TestComponent', 'Info message');
      expect(DebugUtils.info).toHaveBeenCalled();
    });
    
    it('should not log messages for disabled components', () => {
      CalendarDebugUtils.enableComponent('DisabledComponent', false);
      
      // INFO level message for disabled component
      CalendarDebugUtils.info('DisabledComponent', 'Info message');
      expect(DebugUtils.info).not.toHaveBeenCalled();
    });
  });

  describe('Specialized logging methods', () => {
    beforeEach(() => {
      // Set log level to DEBUG for testing
      CalendarDebugUtils.setLogLevel(CalendarDebugUtils.LOG_LEVELS.DEBUG);
      CalendarDebugUtils.enableComponent('TestComponent', true);
    });
    
    it('should log lifecycle events', () => {
      CalendarDebugUtils.logLifecycle('TestComponent', 'mount', { prop1: 'value1' });
      
      expect(DebugUtils.info).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'Lifecycle: mount',
        { prop1: 'value1' }
      );
    });
    
    it('should log hook parameter mismatch', () => {
      const expectedParams = { param1: 'value1', param2: 42 };
      const actualParams = ['value1', 42, true];
      
      CalendarDebugUtils.logHookParameterMismatch('useTestHook', expectedParams, actualParams);
      
      expect(DebugUtils.error).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
    
    it('should log data loading events', () => {
      CalendarDebugUtils.logDataLoading('TestComponent', 'start', { source: 'API' });
      
      expect(DebugUtils.log).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'Data Loading [start]',
        { source: 'API' }
      );
    });
    
    it('should log API requests', () => {
      CalendarDebugUtils.logApiRequest('TestComponent', '/api/appointments', { date: '2025-05-15' });
      
      expect(DebugUtils.log).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'API Request to /api/appointments',
        { date: '2025-05-15' }
      );
    });
    
    it('should log successful API responses', () => {
      CalendarDebugUtils.logApiResponse('TestComponent', '/api/appointments', true, { data: [] });
      
      expect(DebugUtils.log).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'API Response from /api/appointments (Success)',
        { data: [] }
      );
    });
    
    it('should log failed API responses', () => {
      CalendarDebugUtils.logApiResponse('TestComponent', '/api/appointments', false, { error: 'Not found' });
      
      expect(DebugUtils.error).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'API Response from /api/appointments (Failed)',
        { error: 'Not found' }
      );
    });
    
    it('should log state changes', () => {
      CalendarDebugUtils.logStateChange('TestComponent', 'selectedDate', '2025-05-15', '2025-05-16');
      
      expect(DebugUtils.log).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'State Change: selectedDate',
        {
          from: '2025-05-15',
          to: '2025-05-16'
        }
      );
    });
    
    it('should log performance metrics', () => {
      CalendarDebugUtils.logPerformance('TestComponent', 'render', 42, { componentCount: 10 });
      
      expect(DebugUtils.info).toHaveBeenCalledWith(
        'CalendarDebug:TestComponent',
        'Performance [render]: 42ms',
        { componentCount: 10 }
      );
    });
  });

  describe('Data validation and comparison', () => {
    it('should validate hook parameters', () => {
      const validParams = {
        userTimeZone: 'America/New_York',
        currentDate: new Date('2025-05-15')
      };
      
      CalendarDebugUtils.validateHookParameters('useTestHook', validParams);
      expect(DebugUtils.info).toHaveBeenCalled();
      expect(DebugUtils.warn).not.toHaveBeenCalled();
      
      const invalidParams = {
        userTimeZone: 'Invalid/TimeZone',
        currentDate: new Date('invalid date')
      };
      
      CalendarDebugUtils.validateHookParameters('useTestHook', invalidParams);
      expect(DebugUtils.warn).toHaveBeenCalled();
    });
    
    it('should compare matching data structures', () => {
      const expected = { id: 1, name: 'Test' };
      const actual = { id: 1, name: 'Test' };
      
      CalendarDebugUtils.compareDataStructures('test', expected, actual);
      expect(DebugUtils.info).toHaveBeenCalled();
      expect(DebugUtils.warn).not.toHaveBeenCalled();
    });
    
    it('should compare mismatched data structures', () => {
      const expected = { id: 1, name: 'Test', age: 30 };
      const actual = { id: 1, name: 'Test', email: 'test@example.com' };
      
      CalendarDebugUtils.compareDataStructures('test', expected, actual);
      expect(DebugUtils.warn).toHaveBeenCalled();
    });
    
    it('should handle null or undefined in data structure comparison', () => {
      CalendarDebugUtils.compareDataStructures('test', null, {});
      expect(DebugUtils.warn).toHaveBeenCalled();
      
      jest.clearAllMocks();
      
      CalendarDebugUtils.compareDataStructures('test', {}, null);
      expect(DebugUtils.warn).toHaveBeenCalled();
    });
  });

  describe('Timezone and date handling', () => {
    it('should log timezone conversion', () => {
      const utcTime = '2025-05-15T10:30:00Z';
      const userTimeZone = 'America/New_York';
      
      CalendarDebugUtils.logTimezoneConversion('test', utcTime, userTimeZone);
      expect(DebugUtils.log).toHaveBeenCalled();
    });
    
    it('should handle invalid timezone in conversion', () => {
      const utcTime = '2025-05-15T10:30:00Z';
      const invalidTimeZone = 'Invalid/TimeZone';
      
      CalendarDebugUtils.logTimezoneConversion('test', utcTime, invalidTimeZone);
      expect(DebugUtils.error).toHaveBeenCalled();
    });
    
    it('should handle invalid date in conversion', () => {
      const invalidTime = 'not-a-date';
      const userTimeZone = 'America/New_York';
      
      CalendarDebugUtils.logTimezoneConversion('test', invalidTime, userTimeZone);
      expect(DebugUtils.error).toHaveBeenCalled();
    });
  });
});