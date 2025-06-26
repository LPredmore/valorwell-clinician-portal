
import React, { useState } from 'react';
import { addWeeks, subWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CalendarConnectionsPanel from './CalendarConnectionsPanel';
import SchedulerManagementPanel from './SchedulerManagementPanel';
import NylasHybridCalendar from './NylasHybridCalendar';
import { getUserTimeZone } from '@/utils/timeZoneUtils';

interface NylasCalendarViewProps {
  clinicianId: string | null;
}

const NylasCalendarView: React.FC<NylasCalendarViewProps> = ({ clinicianId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const userTimeZone = getUserTimeZone();

  const navigatePrevious = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const navigateNext = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: any) => {
    console.log('Event clicked:', event);
    // TODO: Open event details dialog
  };

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
        {/* Calendar Display - Always Shows Virtual Calendar */}
        <div className="lg:col-span-3">
          <NylasHybridCalendar
            clinicianId={clinicianId}
            userTimeZone={userTimeZone}
            currentDate={currentDate}
            onEventClick={handleEventClick}
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
