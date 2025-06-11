
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar } from 'lucide-react';

interface CalendarLoadingStateProps {
  message?: string;
}

const CalendarLoadingState: React.FC<CalendarLoadingStateProps> = ({ 
  message = "Loading calendar..." 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-gray-600">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarLoadingState;
