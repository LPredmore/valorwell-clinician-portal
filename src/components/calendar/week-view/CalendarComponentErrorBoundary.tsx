import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

interface Props {
  componentName: string;
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  contextData?: Record<string, any>;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * A specialized error boundary for calendar components that provides
 * detailed error reporting and recovery options.
 */
class CalendarComponentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with detailed context information
    CalendarDebugUtils.error(
      this.props.componentName,
      `Error caught in ${this.props.componentName}`,
      {
        error,
        errorInfo,
        contextData: this.props.contextData
      }
    );

    // Update state with error info for display
    this.setState({ errorInfo });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    CalendarDebugUtils.log(
      this.props.componentName,
      'User initiated retry after error',
      this.props.contextData
    );
    
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 m-2">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <h3 className="text-md font-medium text-red-800 mb-1">Component Error</h3>
          <p className="text-red-600 mb-2 text-center text-sm">
            An error occurred in the {this.props.componentName} component.
          </p>
          {this.state.error && import.meta.env.MODE === 'development' && (
            <pre className="text-xs text-red-700 bg-red-100 p-2 rounded mb-2 max-w-full overflow-auto">
              {this.state.error.message}
              {this.state.errorInfo?.componentStack && (
                <div className="mt-2 text-xs">
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </pre>
          )}
          <div className="flex gap-2">
            <Button onClick={this.handleRetry} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CalendarComponentErrorBoundary;