import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Info, RotateCcw, HelpCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { CalendarErrorReporter, ErrorSeverity, ErrorContextData } from '@/utils/calendarErrorReporter';

interface CalendarErrorMessageProps {
  componentName: string;
  error: Error | null;
  message?: string;
  details?: string;
  contextData?: ErrorContextData;
  onRetry?: () => void;
  onReset?: () => void;
  onShowDetails?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * A reusable error message component for calendar components
 * Provides consistent error display with retry and reset options
 */
const CalendarErrorMessage: React.FC<CalendarErrorMessageProps> = ({
  componentName,
  error,
  message,
  details,
  contextData,
  onRetry,
  onReset,
  onShowDetails,
  severity = 'error'
}) => {
  // Get recovery options from the error reporter
  const recoveryOptions = error
    ? CalendarErrorReporter.getRecoveryOptions(error, {
        componentName,
        ...contextData
      })
    : null;

  // Log the error when the component mounts
  useEffect(() => {
    if (error) {
      CalendarErrorReporter.reportError(
        error,
        {
          componentName,
          operation: 'display-error',
          ...contextData
        },
        severity === 'error' ? ErrorSeverity.MEDIUM :
        severity === 'warning' ? ErrorSeverity.LOW :
        ErrorSeverity.LOW
      );
    }
  }, [error, componentName, contextData, severity]);

  // Determine styling based on severity
  const getSeverityStyles = () => {
    switch (severity) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: <AlertTriangle className="h-6 w-6 text-yellow-500 mb-2" />,
          title: 'Warning'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <Info className="h-6 w-6 text-blue-500 mb-2" />,
          title: 'Information'
        };
      case 'error':
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <AlertCircle className="h-6 w-6 text-red-500 mb-2" />,
          title: 'Error'
        };
    }
  };

  const styles = getSeverityStyles();
  
  // Get user-friendly error message from the error reporter if available
  const errorMessage = message ||
    (error ? CalendarErrorReporter.formatUserErrorMessage(error, {
      componentName,
      ...contextData
    }) : 'An unknown error occurred');

  const handleRetry = () => {
    CalendarDebugUtils.log(componentName, 'User initiated retry', contextData);
    if (onRetry) onRetry();
  };

  const handleReset = () => {
    CalendarDebugUtils.log(componentName, 'User initiated reset', contextData);
    if (onReset) onReset();
  };

  const handleShowDetails = () => {
    CalendarDebugUtils.log(componentName, 'User requested error details', {
      error: error?.message,
      stack: error?.stack,
      contextData
    });
    if (onShowDetails) onShowDetails();
  };

  return (
    <div className={`flex flex-col items-center justify-center ${styles.bg} border ${styles.border} rounded-lg p-4 m-2`}>
      {styles.icon}
      <h3 className={`text-md font-medium ${styles.text} mb-1`}>{styles.title}</h3>
      <p className={`${severity === 'error' ? 'text-red-600' : styles.text} mb-2 text-center text-sm`}>
        {errorMessage}
      </p>
      
      {details && (
        <p className="text-xs text-gray-600 mb-2 text-center">
          {details}
        </p>
      )}
      
      {error && import.meta.env.MODE === 'development' && (
        <pre className="text-xs bg-white/50 p-2 rounded mb-2 max-w-full overflow-auto">
          {error.message}
        </pre>
      )}
      
      <div className="flex flex-wrap gap-2 justify-center">
        {onRetry && (recoveryOptions?.canRetry !== false) && (
          <Button
            onClick={handleRetry}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
        
        {onReset && (recoveryOptions?.canReset !== false) && (
          <Button
            onClick={handleReset}
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
            variant="secondary"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              CalendarDebugUtils.log(componentName, 'User clicked contact support', contextData);
              window.alert('Support contact feature would be triggered here.');
            }}
          >
            <HelpCircle className="h-3 w-3" />
            Contact Support
          </Button>
        )}
        
        {onShowDetails && (
          <Button
            onClick={handleShowDetails}
            variant="ghost"
            size="sm"
          >
            Details
          </Button>
        )}
      </div>
      
      {recoveryOptions?.recoveryMessage && (
        <p className="text-xs text-gray-600 mt-2 text-center">
          {recoveryOptions.recoveryMessage}
        </p>
      )}
    </div>
  );
};

export default CalendarErrorMessage;