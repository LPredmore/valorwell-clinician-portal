
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface CalendarErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

const CalendarErrorState: React.FC<CalendarErrorStateProps> = ({ 
  title = "Calendar Error",
  message,
  onRetry,
  showRetry = true
}) => {
  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            <p className="font-medium">{message}</p>
          </div>
          
          {showRetry && onRetry && (
            <Button onClick={onRetry} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          
          <div className="mt-6 text-sm text-gray-500">
            <p>If this error persists, please check:</p>
            <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
              <li>• Database migration has been applied</li>
              <li>• Edge functions are deployed</li>
              <li>• Nylas API credentials are configured</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarErrorState;
