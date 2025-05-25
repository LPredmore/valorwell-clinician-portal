import * as React from 'react';
import { Button } from '@/components/ui/button';
import { CalendarErrorReporter } from '@/utils/calendarErrorReporter';
import { ErrorSeverity } from '@/utils/calendarErrorReporter';
import type { ErrorContextData } from '@/utils/calendarErrorReporter';

interface DataLoadingErrorProps {
  componentName: string;
  error: Error;
  message?: string;
  details?: string;
  onRetry?: () => void;
  onReset?: () => void;
  onShowDetails?: () => void;
  severity?: ErrorSeverity;
  contextData?: ErrorContextData;
}

export const DataLoadingError: React.FC<DataLoadingErrorProps> = ({
  componentName,
  error,
  message = 'Data Loading Error',
  details = 'There was a problem loading the data.',
  onRetry,
  onReset,
  onShowDetails,
  severity = ErrorSeverity.MEDIUM,
  contextData,
}) => {
  const formattedMessage = CalendarErrorReporter.formatUserErrorMessage(error, {
    componentName,
    ...contextData,
  });

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-background rounded-lg border border-destructive">
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-destructive">{message}</h3>
          <p className="text-sm text-muted-foreground">{details}</p>
          <p className="text-sm">{formattedMessage}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
          {onReset && (
            <Button variant="outline" onClick={onReset}>
              Reset
            </Button>
          )}
          {onShowDetails && (
            <Button variant="ghost" onClick={onShowDetails}>
              Show Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataLoadingError;