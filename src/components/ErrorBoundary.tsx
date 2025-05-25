import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { CalendarErrorReporter } from '@/utils/calendarErrorReporter';
import { ErrorSeverity } from '@/utils/calendarErrorReporter';
import type { ErrorContextData } from '@/utils/calendarErrorReporter';

interface ErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
  contextData?: ErrorContextData;
  severity?: ErrorSeverity;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    CalendarDebugUtils.error(this.props.componentName, 'Error boundary caught:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    CalendarErrorReporter.reportError(error, {
      componentName: this.props.componentName,
      ...this.props.contextData,
    }, this.props.severity);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-6 bg-background rounded-lg border border-destructive min-h-[200px]">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-destructive">
                Something went wrong in {this.props.componentName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {CalendarErrorReporter.formatUserErrorMessage(this.state.error!, {
                  componentName: this.props.componentName,
                  ...this.props.contextData,
                })}
              </p>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                Try Again
              </Button>
              
              {this.state.error && (
                <details className="text-left">
                  <summary className="text-sm cursor-pointer">Technical Details</summary>
                  <div className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-60">
                    <pre>{this.state.error.toString()}</pre>
                    <pre>{this.state.error.stack}</pre>
                    {this.state.errorInfo?.componentStack && (
                      <pre>Component stack: {this.state.errorInfo.componentStack}</pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;