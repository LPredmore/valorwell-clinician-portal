
import React, { Component, ReactNode } from 'react';

console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary component loaded');

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
}

/**
 * Enhanced ErrorBoundary with emergency debugging
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary constructor called for:', props.componentName || 'Unknown');
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('❌ [EMERGENCY DEBUG] ErrorBoundary caught error:', error);
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ [EMERGENCY DEBUG] ErrorBoundary componentDidCatch:', {
      componentName: this.props.componentName,
      error: error.message,
      stack: error.stack,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary rendering error UI');
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          border: '2px solid red', 
          borderRadius: '8px',
          backgroundColor: '#ffebee',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2 style={{ color: '#d32f2f', marginTop: 0 }}>
            Error in {this.props.componentName || 'Component'}
          </h2>
          <details style={{ marginTop: '16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details (click to expand)
            </summary>
            <pre style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary rendering children for:', this.props.componentName || 'Unknown');
    return this.props.children;
  }
}

export default ErrorBoundary;
