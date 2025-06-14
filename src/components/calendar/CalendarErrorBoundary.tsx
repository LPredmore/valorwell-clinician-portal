
import React from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ErrorBoundary, { BaseErrorBoundaryProps, BaseErrorBoundaryState, ErrorCategory } from '../common/ErrorBoundary';

/**
 * Specialized Error Boundary for calendar-related errors
 * Extends the base ErrorBoundary with calendar-specific behavior
 */
class CalendarErrorBoundary extends ErrorBoundary {
  // Override getDerivedStateFromError to prioritize calendar error category
  static getDerivedStateFromError(error: Error): Partial<BaseErrorBoundaryState> {
    const baseState = super.getDerivedStateFromError(error);
    
    // If error message contains calendar-related terms, force calendar category
    if (error.message.includes('calendar') ||
        error.message.includes('appointment') ||
        error.message.includes('schedule') ||
        error.message.includes('timezone') ||
        error.message.includes('date') ||
        error.message.includes('time')) {
      return {
        ...baseState,
        errorCategory: ErrorCategory.CALENDAR
      };
    }
    
    return baseState;
  }

  // Override componentDidCatch to add calendar-specific logging
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call parent method first
    super.componentDidCatch(error, errorInfo);
    
    // Add calendar-specific logging
    console.warn('[CalendarErrorBoundary] Calendar-specific error detected:', {
      componentName: this.props.componentName,
      message: error.message,
      isTimezoneError: error.message.includes('timezone'),
      isAppointmentError: error.message.includes('appointment')
    });
    
    // Here you could also log to a calendar-specific error reporting service
  }
  
  // Override getRecoveryStrategy to provide calendar-specific recovery options
  getRecoveryStrategy() {
    return {
      primaryAction: { label: 'Refresh Calendar', handler: this.handleReset },
      secondaryAction: { label: 'Go to Dashboard', handler: () => window.location.href = '/' }
    };
  }
  
  // Override render to provide custom UI for calendar errors
  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Use parent render method if not in calendar category
      if (this.state.errorCategory !== ErrorCategory.CALENDAR) {
        return super.render();
      }
      
      const recovery = this.getRecoveryStrategy();
      
      // Custom calendar error UI
      return (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Calendar className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-800">Calendar Error</h2>
            <p className="text-gray-600 max-w-md">
              There was an error in the calendar component. This might be due to timezone issues,
              data loading problems, or an unexpected application state.
            </p>
            <div className="flex space-x-4">
              <Button onClick={recovery.secondaryAction.handler} variant="outline">
                {recovery.secondaryAction.label}
              </Button>
              <Button onClick={recovery.primaryAction.handler}>
                {recovery.primaryAction.label}
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left w-full">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <div className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                  <p className="font-semibold text-red-600">{this.state.error.message}</p>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="font-semibold text-gray-600">Component Stack:</p>
                      <pre className="whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </Card>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default CalendarErrorBoundary;
