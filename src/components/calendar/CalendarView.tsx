
import React from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import CalendarErrorBoundary from './CalendarErrorBoundary';
import WeeklyCalendarGrid from './WeeklyCalendarGrid';
import AvailabilityManagementSidebar from './AvailabilityManagementSidebar';

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
  console.log('[CalendarView] Rendering traditional weekly calendar with:', {
    clinicianId,
    currentDate,
    userTimeZone,
    refreshTrigger,
    isLoading,
    hasError: !!error
  });

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
        {/* Main Weekly Calendar Display */}
        <div className="lg:col-span-3">
          <WeeklyCalendarGrid
            currentDate={currentDate}
            clinicianId={clinicianId}
            userTimeZone={userTimeZone}
            onAvailabilityClick={(date, startTime, endTime) => {
              console.log('Availability clicked:', { date, startTime, endTime });
              // TODO: Implement availability editing
            }}
          />
        </div>
        
        {/* Availability Management Sidebar */}
        <div className="lg:col-span-1">
          <AvailabilityManagementSidebar
            clinicianId={clinicianId}
            userTimeZone={userTimeZone}
          />
        </div>
      </div>
    </CalendarErrorBoundary>
  );
};

export default CalendarView;
