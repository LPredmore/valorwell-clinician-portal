import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Specialized Error Boundary for authentication-related errors
 * Provides authentication-specific recovery options
 */
class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details with auth-specific context
    console.error(`[AuthErrorBoundary${this.props.componentName ? ` - ${this.props.componentName}` : ''}] Auth error caught:`, error);
    console.error(`[AuthErrorBoundary] Component stack:`, errorInfo.componentStack);
    
    this.setState({ errorInfo });
    
    // Log additional diagnostic information for auth errors
    if (error.message.includes('auth') || error.message.includes('authentication') || 
        error.message.includes('login') || error.message.includes('session')) {
      console.warn('[AuthErrorBoundary] Authentication-specific error detected');
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };
  
  handleLogin = () => {
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default auth error UI with login option
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-red-800">
              {this.props.componentName ? `${this.props.componentName} Authentication Error` : 'Authentication Error'}
            </h2>
            <p className="text-red-600 max-w-md">
              There was a problem with the authentication system. Please try again or go to the login page.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={this.handleReset}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
              <button
                onClick={this.handleLogin}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Go to Login
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