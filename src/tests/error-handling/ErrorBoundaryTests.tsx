import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import CalendarErrorBoundary from '@/components/calendar/CalendarErrorBoundary';

// Component that throws an error
const ErrorThrowingComponent = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="no-error">No error thrown</div>;
};

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary Tests', () => {
  test('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child-content">Child Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  test('should render fallback UI when error occurs', () => {
    // Using jest.spyOn to mock componentDidCatch which is called when an error is thrown
    jest.spyOn(ErrorBoundary.prototype, 'componentDidCatch');

    render(
      <ErrorBoundary componentName="TestComponent">
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    // Check that error boundary caught the error
    expect(ErrorBoundary.prototype.componentDidCatch).toHaveBeenCalled();
    
    // Check that fallback UI is rendered
    expect(screen.getByText('TestComponent Error')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  test('should reset error state when "Try Again" is clicked', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      return (
        <ErrorBoundary componentName="TestComponent">
          {shouldThrow ? (
            <ErrorThrowingComponent />
          ) : (
            <div data-testid="recovered">Recovered from error</div>
          )}
          <button 
            data-testid="toggle-error" 
            onClick={() => setShouldThrow(false)}
            style={{ display: 'none' }}
          >
            Toggle Error
          </button>
        </ErrorBoundary>
      );
    };

    render(<TestComponent />);

    // Error boundary should show error UI
    expect(screen.getByText('TestComponent Error')).toBeInTheDocument();
    
    // Mock the behavior of clicking "Try Again"
    // In a real scenario, this would reset the error boundary state
    // and potentially fix the issue that caused the error
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    
    // Simulate fixing the error condition
    fireEvent.click(screen.getByTestId('toggle-error'));
    
    // Now click try again to reset error boundary
    fireEvent.click(tryAgainButton);
    
    // Component should recover and render without error
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  test('should use custom fallback if provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });
});

describe('CalendarErrorBoundary Tests', () => {
  test('should render children when no error occurs', () => {
    render(
      <CalendarErrorBoundary>
        <div data-testid="calendar-content">Calendar Content</div>
      </CalendarErrorBoundary>
    );

    expect(screen.getByTestId('calendar-content')).toBeInTheDocument();
  });

  test('should render calendar-specific error UI when error occurs', () => {
    jest.spyOn(CalendarErrorBoundary.prototype, 'componentDidCatch');

    render(
      <CalendarErrorBoundary>
        <ErrorThrowingComponent />
      </CalendarErrorBoundary>
    );

    // Check that error boundary caught the error
    expect(CalendarErrorBoundary.prototype.componentDidCatch).toHaveBeenCalled();
    
    // Check that calendar-specific error UI is rendered
    expect(screen.getByText('Calendar Error')).toBeInTheDocument();
    expect(screen.getByText(/timezone issues/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  test('should reset error state when "Try Again" is clicked in calendar error boundary', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      return (
        <CalendarErrorBoundary>
          {shouldThrow ? (
            <ErrorThrowingComponent />
          ) : (
            <div data-testid="calendar-recovered">Calendar recovered from error</div>
          )}
          <button 
            data-testid="toggle-calendar-error" 
            onClick={() => setShouldThrow(false)}
            style={{ display: 'none' }}
          >
            Toggle Calendar Error
          </button>
        </CalendarErrorBoundary>
      );
    };

    render(<TestComponent />);

    // Error boundary should show error UI
    expect(screen.getByText('Calendar Error')).toBeInTheDocument();
    
    // Simulate fixing the error condition
    fireEvent.click(screen.getByTestId('toggle-calendar-error'));
    
    // Now click try again to reset error boundary
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    
    // Component should recover and render without error
    expect(screen.getByTestId('calendar-recovered')).toBeInTheDocument();
  });

  test('should use custom fallback if provided in calendar error boundary', () => {
    const customFallback = <div data-testid="custom-calendar-fallback">Custom Calendar Error UI</div>;
    
    render(
      <CalendarErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent />
      </CalendarErrorBoundary>
    );
    
    expect(screen.getByTestId('custom-calendar-fallback')).toBeInTheDocument();
  });
});