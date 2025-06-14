import React from 'react';
import { LogIn } from 'lucide-react';
import ErrorBoundary, { BaseErrorBoundaryProps, BaseErrorBoundaryState, ErrorCategory } from '../common/ErrorBoundary';

/**
 * Specialized Error Boundary for authentication-related errors
 * Extends the base ErrorBoundary with authentication-specific behavior
 */
class AuthErrorBoundary extends ErrorBoundary {
  // Override getDerivedStateFromError to force authentication error category
  static getDerivedStateFromError(error: Error): Partial<BaseErrorBoundaryState> {
    const baseState = super.getDerivedStateFromError(error);
    
    // Always categorize as authentication error in this boundary
    return {
      ...baseState,
      errorCategory: ErrorCategory.AUTHENTICATION
    };
  }

  // Override componentDidCatch to add auth-specific logging
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call parent method first
    super.componentDidCatch(error, errorInfo);
    
    // Add auth-specific logging
    console.warn('[AuthErrorBoundary] Authentication-specific error detected:', {
      componentName: this.props.componentName,
      message: error.message,
      isTokenError: error.message.includes('token'),
      isSessionError: error.message.includes('session')
    });
    
    // Here you could also log to an authentication-specific error reporting service
  }
  
  // Override getRecoveryStrategy to provide auth-specific recovery options
  getRecoveryStrategy() {
    return {
      primaryAction: { label: 'Go to Login', handler: () => window.location.href = '/login' },
      secondaryAction: { label: 'Try Again', handler: this.handleReset }
    };
  }
  
  // Override render to provide custom UI for auth errors
  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Use parent render method if not in authentication category
      if (this.state.errorCategory !== ErrorCategory.AUTHENTICATION) {
        return super.render();
      }
      
      const recovery = this.getRecoveryStrategy();
      
      // Custom auth error UI
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <LogIn className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-red-800">
              {this.props.componentName ? `${this.props.componentName} Authentication Error` : 'Authentication Error'}
            </h2>
            <p className="text-red-600 max-w-md">
              Your session may have expired or there was a problem with authentication.
              Please try again or go to the login page.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={recovery.secondaryAction.handler}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
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

    return this.props.children;
  }
}

export default AuthErrorBoundary;