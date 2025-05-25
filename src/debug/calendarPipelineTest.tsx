import React from 'react';
import { render } from '@testing-library/react';
import CalendarPage from '@/pages/Calendar';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Mock the debug utils to capture logs
const mockLog = jest.fn();
CalendarDebugUtils.log = mockLog;
CalendarDebugUtils.error = mockLog;

describe('Calendar Data Pipeline', () => {
  it('should handle timezone column correctly', () => {
    // Test with valid timezone
    render(<CalendarPage />);
    expect(mockLog).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('timezone'),
      expect.objectContaining({
        timezone: expect.any(String)
      })
    );

    // Test with invalid timezone (should fallback to default)
    mockLog.mockClear();
    // Mock invalid timezone in test environment
    process.env.TEST_INVALID_TIMEZONE = 'true';
    render(<CalendarPage />);
    expect(mockLog).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Invalid timezone format'),
      expect.any(Object)
    );
  });

  it('should handle partial availability data', () => {
    // Mock partial availability data in test environment
    process.env.TEST_PARTIAL_AVAILABILITY = 'true';
    render(<CalendarPage />);
    expect(mockLog).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Partial availability data detected'),
      expect.objectContaining({
        hasStartTime: expect.any(Boolean),
        hasEndTime: expect.any(Boolean)
      })
    );
  });

  it('should trigger error boundary on render errors', () => {
    // Force a render error in test environment
    process.env.TEST_RENDER_ERROR = 'true';
    const { getByText } = render(<CalendarPage />);
    expect(getByText('There was an error rendering the calendar view')).toBeInTheDocument();
  });
});