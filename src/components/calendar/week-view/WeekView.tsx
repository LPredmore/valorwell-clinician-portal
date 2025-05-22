
import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useWeekViewData } from './useWeekViewData';
import TimeSlot from './TimeSlot';
import { Appointment } from '@/types/appointment';

interface WeekViewProps {
  currentDate: Date;
  clinicianId: string | null;
  showAvailability?: boolean;
  userTimeZone?: string;
  refreshTrigger?: number;
  appointments?: Appointment[];
  isLoading?: boolean;
  error?: Error | null;
}

const WeekView: React.FC<WeekViewProps> = ({ 
  currentDate, 
  clinicianId, 
  showAvailability = true,
  userTimeZone = 'America/Chicago',
  refreshTrigger = 0,
  appointments = [],
  isLoading = false,
  error = null
}) => {
  const { 
    days, 
    timeSlots, 
    dayHeaders,
    availabilityBlocks,
    appointmentBlocks,
    loading: dataLoading
  } = useWeekViewData(
    currentDate, 
    clinicianId, 
    refreshTrigger, 
    appointments,
    userTimeZone
  );

  // Allow custom time slot styling
  const getTimeSlotStyle = useCallback((slotTime: string, dayIndex: number) => {
    // Default style
    return {
      backgroundColor: 'transparent'
    };
  }, []);

  // Allow custom block styling based on the type
  const getAppointmentBlockStyle = useCallback((block: any) => {
    // Base styles for all appointment blocks
    let style = {
      backgroundColor: '#4F46E5', // Default indigo color
      color: 'white',
      borderRadius: '0.375rem',
    };

    // Override styles for personal events
    if (block.isPersonalEvent || block.type === 'personal') {
      style = {
        ...style,
        backgroundColor: '#10B981', // Green for personal events
        opacity: 0.85,
        border: '1px dashed #059669',
      };
    }

    return style;
  }, []);

  if (isLoading || dataLoading) {
    return (
      <Card className="p-4 flex justify-center items-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-valorwell-500 mr-2" />
        <span>Loading calendar...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-red-500">Error loading calendar: {error.message}</div>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-[auto_repeat(7,_1fr)] h-[700px] overflow-auto">
        {/* Time column */}
        <div className="sticky left-0 bg-white border-r border-gray-200 z-10">
          <div className="h-12 border-b border-gray-200"></div>
          {timeSlots.map((time, index) => (
            <div 
              key={`time-${index}`}
              className="h-12 px-2 text-xs text-gray-500 flex items-start justify-end pt-1 border-b border-gray-200"
            >
              {time}
            </div>
          ))}
        </div>
      
        {/* Day columns with headers */}
        {days.map((day, dayIndex) => (
          <div key={`day-${dayIndex}`} className="flex flex-col">
            {/* Day header */}
            <div 
              className={`h-12 border-b border-r border-gray-200 flex flex-col items-center justify-center
                ${dayHeaders[dayIndex].isToday ? 'bg-blue-50' : ''}
                ${dayHeaders[dayIndex].isWeekend ? 'bg-gray-50' : ''}
              `}
            >
              <div className="text-sm font-medium">{dayHeaders[dayIndex].dayName}</div>
              <div className={`text-xs ${dayHeaders[dayIndex].isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                {dayHeaders[dayIndex].date}
              </div>
            </div>
            
            {/* Time slots */}
            {timeSlots.map((time, timeIndex) => (
              <TimeSlot
                key={`slot-${dayIndex}-${timeIndex}`}
                dayIndex={dayIndex}
                timeIndex={timeIndex}
                time={time}
                date={day}
                availabilityBlocks={showAvailability ? availabilityBlocks : []}
                appointmentBlocks={appointmentBlocks}
                style={getTimeSlotStyle(time, dayIndex)} 
                getAppointmentBlockStyle={getAppointmentBlockStyle}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default WeekView;
