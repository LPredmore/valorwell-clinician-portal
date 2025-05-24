import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { CalendarErrorReporter, ErrorSeverity, ErrorContextData } from '@/utils/calendarErrorReporter';
import CalendarErrorMessage from './CalendarErrorMessage';

interface Props {
  sectionName: string;
  componentName: string;
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  contextData?: Partial<ErrorContextData>;
  renderFallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * A specialized error boundary for sections within calendar components
 * Provides more granular error handling for specific sections of the calendar
 */
class WeekViewSectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { sectionName, componentName, contextData, onError } = this.props;
    
    // Create a complete context object
    const fullContext: ErrorContextData = {
      componentName,
      operation: `render-${sectionName}`,
      ...contextData
    };
    
    // Report the error using the centralized reporter
    CalendarErrorReporter.reportError(
      error, 
      fullContext,
      ErrorSeverity.MEDIUM
    );
    
    // Log detailed error information
    CalendarDebugUtils.error(
      componentName,
      `Error in ${sectionName} section`,
      {
        error,
        errorInfo,
        contextData
      }
    );

    // Update state with error info for display
    this.setState({ errorInfo });

    // Call the onError callback if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    const { sectionName, componentName, contextData, onRetry } = this.props;
    
    CalendarDebugUtils.log(
      componentName,
      `User initiated retry for ${sectionName} section`,
      contextData
    );
    
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    if (onRetry) {
      onRetry();
    }
  };

  public render() {
    const { sectionName, componentName, children, fallback, renderFallback, contextData } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      // If a custom render function is provided, use it
      if (renderFallback) {
        return renderFallback(error, this.handleRetry);
      }
      
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <CalendarErrorMessage
          componentName={componentName}
          error={error}
          message={`Error in ${sectionName} section`}
          details="This part of the calendar encountered a problem."
          onRetry={this.handleRetry}
          severity="error"
          contextData={{
            componentName,
            operation: `render-${sectionName}`,
            ...contextData
          }}
        />
      );
    }

    return children;
  }
}

export default WeekViewSectionErrorBoundary;