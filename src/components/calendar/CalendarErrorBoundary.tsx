
import React, { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Enhanced error boundary for calendar components
 * Provides better error reporting and recovery options
 */
class CalendarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[CalendarErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console with component stack trace
    console.error('[CalendarErrorBoundary] Error details:', error);
    console.error('[CalendarErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // Here you could also log to an error reporting service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };
  
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-800">Calendar Error</h2>
            <p className="text-gray-600 max-w-md">
              There was an error in the calendar component. This might be due to timezone issues,
              data loading problems, or an unexpected application state.
            </p>
            <div className="flex space-x-4">
              <Button onClick={this.handleReset} variant="outline">
                Try Again
              </Button>
              <Button onClick={this.handleReload}>
                Reload Page
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
