
import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

console.log('🚀 [EMERGENCY DEBUG] BaseErrorBoundary component loaded');

// Error categories for better error handling
export enum ErrorCategory {
  GENERAL = 'general',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  DATA = 'data',
  UI = 'ui',
  CALENDAR = 'calendar',
  INTEGRATION = 'integration'
}

// Base error boundary state
export interface BaseErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCategory: ErrorCategory;
}

// Base error boundary props
export interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

/**
 * Base ErrorBoundary that serves as the foundation for all error boundaries
 * Implements standardized error handling, categorization, and recovery strategies
 */
class ErrorBoundary extends Component<BaseErrorBoundaryProps, BaseErrorBoundaryState> {
  constructor(props: BaseErrorBoundaryProps) {
    super(props);
    console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary constructor called for:', props.componentName || 'Unknown');
    this.state = {
      hasError: false,
      errorCategory: ErrorCategory.GENERAL
    };
  }

  static getDerivedStateFromError(error: Error): Partial<BaseErrorBoundaryState> {
    console.error('❌ [EMERGENCY DEBUG] ErrorBoundary caught error:', error);
    
    // Categorize error based on message content
    let errorCategory = ErrorCategory.GENERAL;
    
    if (error.message.includes('auth') || error.message.includes('login') ||
        error.message.includes('session') || error.message.includes('token')) {
      errorCategory = ErrorCategory.AUTHENTICATION;
    } else if (error.message.includes('permission') || error.message.includes('forbidden') ||
               error.message.includes('access denied')) {
      errorCategory = ErrorCategory.AUTHORIZATION;
    } else if (error.message.includes('network') || error.message.includes('fetch') ||
               error.message.includes('http') || error.message.includes('request')) {
      errorCategory = ErrorCategory.NETWORK;
    } else if (error.message.includes('data') || error.message.includes('parse') ||
               error.message.includes('json') || error.message.includes('format')) {
      errorCategory = ErrorCategory.DATA;
    } else if (error.message.includes('calendar') || error.message.includes('appointment') ||
               error.message.includes('schedule')) {
      errorCategory = ErrorCategory.CALENDAR;
    } else if (error.message.includes('nylas') || error.message.includes('integration') ||
               error.message.includes('external')) {
      errorCategory = ErrorCategory.INTEGRATION;
    }
    
    return {
      hasError: true,
      error,
      errorCategory
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`❌ [EMERGENCY DEBUG] ErrorBoundary (${this.props.componentName || 'Unknown'}) caught error:`, {
      message: error.message,
      stack: error.stack,
      category: this.state.errorCategory,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({ errorInfo });
    
    // Here you could also log to an error reporting service
  }
  
  // Reset error state and optionally call onReset prop
  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCategory: ErrorCategory.GENERAL
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };
  
  // Reload the page
  handleReload = () => {
    window.location.reload();
  };
  
  // Get recovery strategy based on error category
  getRecoveryStrategy() {
    switch (this.state.errorCategory) {
      case ErrorCategory.AUTHENTICATION:
        return {
          primaryAction: { label: 'Go to Login', handler: () => window.location.href = '/login' },
          secondaryAction: { label: 'Try Again', handler: this.handleReset }
        };
      case ErrorCategory.NETWORK:
        return {
          primaryAction: { label: 'Retry', handler: this.handleReset },
          secondaryAction: { label: 'Reload Page', handler: this.handleReload }
        };
      case ErrorCategory.CALENDAR:
        return {
          primaryAction: { label: 'Refresh Calendar', handler: this.handleReset },
          secondaryAction: { label: 'Go to Dashboard', handler: () => window.location.href = '/' }
        };
      default:
        return {
          primaryAction: { label: 'Try Again', handler: this.handleReset },
          secondaryAction: { label: 'Reload Page', handler: this.handleReload }
        };
    }
  }

  render() {
    if (this.state.hasError) {
      console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary rendering error UI');
      
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const recovery = this.getRecoveryStrategy();
      
      // Default error UI
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-red-800">
              {this.props.componentName ? `Error in ${this.props.componentName}` : 'Application Error'}
            </h2>
            <p className="text-red-600 max-w-md">
              {this.getCategorySpecificMessage()}
            </p>
            <div className="flex space-x-4">
              <button
                onClick={recovery.secondaryAction.handler}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {recovery.secondaryAction.label}
              </button>
              <button
                onClick={recovery.primaryAction.handler}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {recovery.primaryAction.label}
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left w-full">
                <summary className="cursor-pointer text-sm text-red-500">Error Details</summary>
                <div className="mt-2 text-xs bg-white p-3 rounded border border-red-200 overflow-auto max-h-60">
                  <p className="font-semibold text-red-600">{this.state.error.message}</p>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <div className="mt-2 pt-2 border-t border-red-100">
                      <p className="font-semibold text-red-600">Component Stack:</p>
                      <pre className="whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary rendering children for:', this.props.componentName || 'Unknown');
    return this.props.children;
  }
  
  // Get error message based on category
  private getCategorySpecificMessage(): string {
    switch (this.state.errorCategory) {
      case ErrorCategory.AUTHENTICATION:
        return 'There was a problem with authentication. Please try again or go to the login page.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to access this resource. Please contact support if you believe this is an error.';
      case ErrorCategory.NETWORK:
        return 'There was a problem connecting to the server. Please check your internet connection and try again.';
      case ErrorCategory.DATA:
        return 'There was a problem with the data. Please try again or contact support.';
      case ErrorCategory.CALENDAR:
        return 'There was a problem with the calendar. This might be due to timezone issues or data loading problems.';
      case ErrorCategory.INTEGRATION:
        return 'There was a problem with an external integration. Please try again or contact support.';
      default:
        return 'An unexpected error occurred. Please try again or reload the page.';
    }
  }
}

export default ErrorBoundary;
