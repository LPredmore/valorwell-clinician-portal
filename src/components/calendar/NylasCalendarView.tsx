
import React, { useState } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CalendarConnectionsPanel from './CalendarConnectionsPanel';
import SchedulerManagementPanel from './SchedulerManagementPanel';
import NylasHybridCalendar from './NylasHybridCalendar';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';

interface NylasCalendarViewProps {
  clinicianId: string | null;
}

const NylasCalendarView: React.FC<NylasCalendarViewProps> = ({ clinicianId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const userTimeZone = getUserTimeZone();
  const { infrastructureError } = useNylasIntegration();

  const navigatePrevious = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const navigateNext = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Show infrastructure error if detected
  if (infrastructureError) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Infrastructure Setup Required
          </CardTitle>
          <CardDescription>
            The Nylas calendar integration requires additional setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error Details:</p>
              <p className="text-red-700 text-sm mt-1">{infrastructureError}</p>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">Required Setup Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Apply Nylas database migrations</li>
                <li>Deploy Nylas edge functions (nylas-auth, nylas-events, etc.)</li>
                <li>Configure Nylas API credentials in Supabase secrets</li>
                <li>Test the authentication flow</li>
              </ol>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 text-sm">
                <strong>For Development:</strong> Check the Supabase dashboard to ensure all migrations 
                are applied and edge functions are deployed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={navigateToday}>
            Today
          </Button>
          <Button variant="outline" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </h2>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Display */}
        <div className="lg:col-span-3">
          <NylasHybridCalendar
            clinicianId={clinicianId}
            userTimeZone={userTimeZone}
            currentDate={currentDate}
          />
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <CalendarConnectionsPanel />
          <SchedulerManagementPanel clinicianId={clinicianId} />
        </div>
      </div>
    </div>
  );
};

export default NylasCalendarView;
