
import React from 'react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { useNylasEvents } from '@/hooks/useNylasEvents';
import { useNylasScheduler } from '@/hooks/useNylasScheduler';
import { addWeeks, subWeeks } from 'date-fns';
import CalendarErrorBoundary from './CalendarErrorBoundary';
import NylasHybridCalendar from './NylasHybridCalendar';
import CalendarConnectionsPanel from './CalendarConnectionsPanel';
import SchedulerManagementPanel from './SchedulerManagementPanel';

interface CalendarProps {
  view: 'week' | 'month';
  showAvailability: boolean;
  clinicianId: string | null;
  currentDate: Date;
  userTimeZone: string;
  clinicianTimeZone: string;
  refreshTrigger: number;
  appointments: any[];
  isLoading: boolean;
  error: any;
}

const CalendarView = ({ 
  clinicianId, 
  currentDate, 
  userTimeZone,
  refreshTrigger = 0,
  isLoading = false,
  error = null
}: CalendarProps) => {
  console.log('[CalendarView] Rendering Nylas-only calendar with:', {
    clinicianId,
    currentDate,
    userTimeZone,
    refreshTrigger,
    isLoading,
    hasError: !!error
  });

  // Calculate date range for external events
  const startDate = subWeeks(currentDate, 2);
  const endDate = addWeeks(currentDate, 4);

  const handleEventClick = (event: any) => {
    console.log('[CalendarView] External event clicked:', event);
    // Handle external calendar event clicks here
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-red-600">
          <p>Error loading calendar: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <CalendarErrorBoundary>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Nylas Calendar Display */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Calendar</h2>
            <NylasHybridCalendar
              clinicianId={clinicianId}
              userTimeZone={userTimeZone}
              currentDate={currentDate}
              onEventClick={handleEventClick}
            />
          </div>
        </div>
        
        {/* Sidebar with management panels */}
        <div className="lg:col-span-1 space-y-4">
          <CalendarConnectionsPanel />
          
          <SchedulerManagementPanel 
            clinicianId={clinicianId} 
          />
        </div>
      </div>
    </CalendarErrorBoundary>
  );
};

export default CalendarView;
