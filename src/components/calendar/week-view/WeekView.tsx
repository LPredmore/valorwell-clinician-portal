
import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useWeekViewData } from './useWeekViewData';
import TimeSlot from './TimeSlot';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';

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
  // Generate an array of dates for the current week
  const weekDays = useMemo(() => {
    const dt = DateTime.fromJSDate(currentDate);
    const startOfWeek = dt.startOf('week');
    
    // Create an array of 7 dates starting from the start of the week
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.plus({ days: i }).toJSDate());
    }
    return days;
  }, [currentDate]);

  const { 
    loading: dataLoading,
    weekDays: weekDayDTs,
    timeBlocks,
    availabilityBlocks,
    appointmentBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot
  } = useWeekViewData(
    weekDays, // Pass the array of dates
    clinicianId, 
    refreshTrigger, 
    appointments,
    (id: string) => `Client ${id}`, // Add the missing getClientName parameter
    userTimeZone
  );
  
  // Generate time slots - 30 minute intervals from 7am to 7pm
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);
  
  // Generate day headers with day name and date
  const dayHeaders = useMemo(() => {
    return weekDayDTs.map(day => {
      const isToday = day.hasSame(DateTime.local(), 'day');
      const isWeekend = [6, 0].includes(day.weekday);
      return {
        dayName: day.toFormat('EEE'),
        date: day.toFormat('MMM d'),
        isToday,
        isWeekend
      };
    });
  }, [weekDayDTs]);

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
    let style: {
      backgroundColor: string;
      color: string;
      borderRadius: string;
      border?: string;
      opacity?: number;
    } = {
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
        {weekDays.map((day, dayIndex) => (
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
                day={day}
                timeSlot={new Date(new Date().setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1])))}
                isAvailable={showAvailability && isTimeSlotAvailable(day, new Date(new Date().setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]))))}
                currentBlock={getBlockForTimeSlot(day, new Date(new Date().setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]))))}
                appointment={getAppointmentForTimeSlot(day, new Date(new Date().setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]))))}
                isStartOfBlock={false} // This will be determined in the TimeSlot component
                isEndOfBlock={false} // This will be determined in the TimeSlot component
                isStartOfAppointment={false} // This will be determined in the TimeSlot component
                isEndOfAppointment={false} // This will be determined in the TimeSlot component
                handleAvailabilityBlockClick={() => {}}
                originalAppointments={appointments}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default WeekView;
