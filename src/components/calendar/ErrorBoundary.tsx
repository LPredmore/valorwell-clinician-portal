import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, RotateCcw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { CalendarErrorReporter, ErrorSeverity, ErrorContextData } from '@/utils/calendarErrorReporter';

interface ErrorBoundaryProps {
  componentName: string;
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, componentName: string) => void;
  onRetry?: () => void;
  onReset?: () => void;
  contextData?: Record<string, any>;
  maxRetries?: number;
  retryDelay?: number; // in milliseconds
  enableAutoRetry?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRetrying: boolean;
  errorTimestamp: number;
  errorHistory: Array<{
    error: Error;
    timestamp: number;
    componentName: string;
    contextData?: Record<string, any>;
  }>;
}

/**
 * Enhanced error boundary component with improved error handling, 
 * automatic retries, and detailed error reporting
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;
  
  public static defaultProps = {
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    enableAutoRetry: false
  };

  public state: ErrorBoundaryState = {
    hasError: false,
    retryCount: 0,
    isRetrying: false,
    errorTimestamp: 0,
    errorHistory: []
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName, contextData, onError, maxRetries, enableAutoRetry } = this.props;
    const now = Date.now();
    
    // Update error history
    const updatedErrorHistory = [
      ...this.state.errorHistory,
      {
        error,
        timestamp: now,
        componentName,
        contextData
      }
    ].slice(-5); // Keep only the last 5 errors
    
    // Log the error with detailed context information
    CalendarDebugUtils.error(
      componentName,
      `Error caught in ${componentName}`,
      {
        error,
        errorInfo,
        contextData,
        retryCount: this.state.retryCount,
        errorHistory: updatedErrorHistory
      }
    );

    // Report the error to the centralized error reporter
    CalendarErrorReporter.reportError(
      error,
      {
        componentName,
        operation: 'render',
        ...contextData
      },
      this.determineErrorSeverity(error, this.state.retryCount)
    );

    // Update state with error info for display
    this.setState({
      error,
      errorInfo,
      errorTimestamp: now,
      errorHistory: updatedErrorHistory
    });

    // Call the onError callback if provided
    if (onError) {
      onError(error, errorInfo, componentName);
    }

    // Attempt automatic retry if enabled and under max retries
    if (enableAutoRetry && this.state.retryCount < (maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  private determineErrorSeverity(error: Error, retryCount: number): ErrorSeverity {
    // Determine severity based on error type and retry count
    if (error.message.includes('critical') || error.message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    
    if (retryCount >= (this.props.maxRetries || 3)) {
      return ErrorSeverity.HIGH;
    }
    
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return ErrorSeverity.MEDIUM;
    }
    
    return ErrorSeverity.MEDIUM;
  }

  private scheduleRetry = () => {
    const { retryDelay } = this.props;
    
    this.setState({ isRetrying: true });
    
    // Clear any existing timeout
    if (this.retryTimeoutId !== null) {
      window.clearTimeout(this.retryTimeoutId);
    }
    
    // Schedule retry
    this.retryTimeoutId = window.setTimeout(() => {
      this.handleRetry();
    }, retryDelay);
    
    CalendarDebugUtils.log(
      this.props.componentName,
      `Scheduled automatic retry in ${retryDelay}ms`,
      { retryCount: this.state.retryCount + 1 }
    );
  };

  private handleRetry = () => {
    const { componentName } = this.props;
    
    CalendarDebugUtils.log(
      componentName,
      'Retrying after error',
      { 
        retryCount: this.state.retryCount + 1,
        error: this.state.error?.message
      }
    );
    
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
      isRetrying: false
    }));
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private handleReset = () => {
    const { componentName } = this.props;
    
    CalendarDebugUtils.log(
      componentName,
      'Resetting component state after error',
      { errorHistory: this.state.errorHistory.length }
    );
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isRetrying: false
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleContactSupport = () => {
    const { componentName } = this.props;
    const { error, errorInfo, errorHistory } = this.state;
    
    CalendarDebugUtils.log(
      componentName,
      'User requested support after error',
      { 
        error: error?.message,
        errorHistory: errorHistory.length
      }
    );
    
    // In a real application, this would open a support ticket or chat
    alert(`Support request would be sent with error details: ${error?.message}`);
  };

  public componentWillUnmount() {
    // Clear any pending retry timeout
    if (this.retryTimeoutId !== null) {
      window.clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  public render() {
    const { hasError, error, errorInfo, retryCount, isRetrying } = this.state;
    const { children, fallback, componentName, maxRetries } = this.props;
    
    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback;
      }

      // Get recovery options from the error reporter
      const recoveryOptions = error
        ? CalendarErrorReporter.getRecoveryOptions(error, {
            componentName,
            retryCount,
            ...this.props.contextData
          })
        : null;

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 m-2">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <h3 className="text-md font-medium text-red-800 mb-1">Component Error</h3>
          <p className="text-red-600 mb-2 text-center text-sm">
            An error occurred in the {componentName} component.
            {retryCount > 0 && ` (Retry ${retryCount}/${maxRetries})`}
          </p>
          
          {error && import.meta.env.MODE === 'development' && (
            <pre className="text-xs text-red-700 bg-red-100 p-2 rounded mb-2 max-w-full overflow-auto">
              {error.message}
              {errorInfo?.componentStack && (
                <div className="mt-2 text-xs">
                  {errorInfo.componentStack}
                </div>
              )}
            </pre>
          )}
          
          <div className="flex gap-2 flex-wrap justify-center">
            {recoveryOptions?.canRetry !== false && retryCount < (maxRetries || 3) && (
              <Button 
                onClick={this.handleRetry} 
                variant="outline" 
                size="sm"
                disabled={isRetrying}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
            
            {recoveryOptions?.canReset !== false && (
              <Button 
                onClick={this.handleReset} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
            
            {recoveryOptions?.suggestedAction === 'contact-support' && (
              <Button 
                onClick={this.handleContactSupport} 
                variant="secondary" 
                size="sm"
                className="flex items-center gap-1"
              >
                <HelpCircle className="h-3 w-3" />
                Contact Support
              </Button>
            )}
          </div>
          
          {recoveryOptions?.recoveryMessage && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              {recoveryOptions.recoveryMessage}
            </p>
          )}
          
          {retryCount >= (maxRetries || 3) && (
            <p className="text-xs text-red-600 mt-2 text-center">
              Maximum retry attempts reached. Please try again later or contact support.
            </p>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;