
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class CalendarErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('[CalendarErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CalendarErrorBoundary] Component error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    console.log('[CalendarErrorBoundary] User requested retry');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    console.log('[CalendarErrorBoundary] User requested page reload');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="mx-auto max-w-lg mt-8">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">
              {this.props.fallbackTitle || 'Calendar Loading Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-red-600">
              There was an error loading the calendar. This might be due to a temporary issue with the availability data.
            </p>
            
            {this.state.error && import.meta.env.MODE === 'development' && (
              <div className="rounded bg-red-50 p-3">
                <p className="text-xs font-medium text-red-800 mb-1">Error Details:</p>
                <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleRetry} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default CalendarErrorBoundary;
