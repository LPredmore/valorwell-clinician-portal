
import React, { useMemo } from 'react';
import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Card } from '@/components/ui/card';

interface WeeklyCalendarGridProps {
  currentDate: Date;
  clinicianId: string | null;
  userTimeZone: string;
  onAvailabilityClick?: (date: DateTime, startTime: DateTime, endTime: DateTime) => void;
}

const WeeklyCalendarGrid: React.FC<WeeklyCalendarGridProps> = ({
  currentDate,
  clinicianId,
  userTimeZone,
  onAvailabilityClick
}) => {
  // Get week boundaries (Sunday to Saturday)
  const weekStart = useMemo(() => {
    const dt = TimeZoneService.fromJSDate(currentDate, userTimeZone);
    return dt.startOf('week'); // Luxon starts week on Monday, so we'll adjust
  }, [currentDate, userTimeZone]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.plus({ days: i }));
    }
    return days;
  }, [weekStart]);

  // Dynamic time range (default 8am-10pm, will be enhanced later)
  const timeRange = useMemo(() => {
    return {
      startHour: 8,
      endHour: 22 // 10 PM
    };
  }, []);

  // Generate time slots (30-minute intervals)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = timeRange.startHour; hour <= timeRange.endHour; hour++) {
      slots.push({ hour, minute: 0 });
      if (hour < timeRange.endHour) {
        slots.push({ hour, minute: 30 });
      }
    }
    return slots;
  }, [timeRange]);

  const formatTimeSlot = (hour: number, minute: number) => {
    const dt = DateTime.now().set({ hour, minute });
    return dt.toFormat('h:mm a');
  };

  const getDayName = (date: DateTime) => {
    return date.toFormat('EEE');
  };

  const getDayNumber = (date: DateTime) => {
    return date.toFormat('d');
  };

  const isToday = (date: DateTime) => {
    const today = TimeZoneService.now(userTimeZone);
    return date.hasSame(today, 'day');
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-8 gap-1 min-h-[600px]">
        {/* Time column header */}
        <div className="border-r border-gray-200">
          <div className="h-16 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            Time
          </div>
        </div>

        {/* Day headers */}
        {weekDays.map((day, index) => (
          <div key={index} className="border-r border-gray-200 last:border-r-0">
            <div className="h-16 border-b border-gray-200 flex flex-col items-center justify-center">
              <div className="text-sm font-medium text-gray-900">
                {getDayName(day)}
              </div>
              <div className={`text-lg font-semibold ${
                isToday(day) ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {getDayNumber(day)}
              </div>
            </div>
          </div>
        ))}

        {/* Time slots */}
        {timeSlots.map((slot, slotIndex) => (
          <React.Fragment key={slotIndex}>
            {/* Time label */}
            <div className="border-r border-gray-200 h-12 flex items-center justify-end pr-2 text-xs text-gray-500">
              {slot.minute === 0 ? formatTimeSlot(slot.hour, slot.minute) : ''}
            </div>

            {/* Day cells */}
            {weekDays.map((day, dayIndex) => (
              <div
                key={`${slotIndex}-${dayIndex}`}
                className="border-r border-b border-gray-100 h-12 hover:bg-gray-50 cursor-pointer transition-colors last:border-r-0"
                onClick={() => {
                  const slotDateTime = day.set({ 
                    hour: slot.hour, 
                    minute: slot.minute 
                  });
                  const endDateTime = slotDateTime.plus({ minutes: 30 });
                  onAvailabilityClick?.(day, slotDateTime, endDateTime);
                }}
              >
                {/* This will be populated with availability blocks and appointments */}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

export default WeeklyCalendarGrid;
