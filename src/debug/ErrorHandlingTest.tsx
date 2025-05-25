import WeekView from '@/components/calendar/week-view/WeekView';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataLoadingError } from '@/components/DataLoadingError';

export const ErrorHandlingTest = () => {
  const throwError = () => {
    throw new Error('Test error from button click');
  };

  return (
    <div className="space-y-8 p-4">
      <div className="border p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-4">ErrorBoundary Test</h2>
        <ErrorBoundary componentName="ErrorHandlingTest">
          {null}
          <button 
            onClick={throwError}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded"
          >
            Throw Error
          </button>
        </ErrorBoundary>
      </div>

      <div className="border p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-4">WeekView with ErrorBoundary</h2>
        <ErrorBoundary
          componentName="WeekView"
          fallback={
            <DataLoadingError
              componentName="WeekView"
              error={new Error('Failed to load week view data')}
              onRetry={() => window.location.reload()}
            />
          }
        >
          {null}
          <WeekView />
        </ErrorBoundary>
      </div>
    </div>
  );
};