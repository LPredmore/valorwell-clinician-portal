
import React, { useMemo, useCallback } from 'react';
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
  // Memoized week boundaries calculation
  const weekBoundaries = useMemo(() => {
    const dt = TimeZoneService.fromJSDate(currentDate, userTimeZone);
    const weekStart = dt.startOf('week');
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.plus({ days: i }));
    }
    return { weekStart, days };
  }, [currentDate, userTimeZone]);

  // Memoized time range configuration
  const timeConfig = useMemo(() => ({
    startHour: 8,
    endHour: 22 // 10 PM
  }), []);

  // Memoized time slots generation
  const timeSlots = useMemo(() => {
    console.log('[WeeklyCalendarGrid] Generating time slots');
    const slots = [];
    for (let hour = timeConfig.startHour; hour <= timeConfig.endHour; hour++) {
      slots.push({ hour, minute: 0 });
      if (hour < timeConfig.endHour) {
        slots.push({ hour, minute: 30 });
      }
    }
    return slots;
  }, [timeConfig]);

  // Memoized formatting functions
  const formatters = useMemo(() => ({
    formatTimeSlot: (hour: number, minute: number) => {
      const dt = DateTime.now().set({ hour, minute });
      return dt.toFormat('h:mm a');
    },
    getDayName: (date: DateTime) => date.toFormat('EEE'),
    getDayNumber: (date: DateTime) => date.toFormat('d'),
    isToday: (date: DateTime) => {
      const today = TimeZoneService.now(userTimeZone);
      return date.hasSame(today, 'day');
    }
  }), [userTimeZone]);

  // Memoized click handler
  const handleCellClick = useCallback((day: DateTime, slot: { hour: number; minute: number }) => {
    if (!onAvailabilityClick) return;
    
    const slotDateTime = day.set({ 
      hour: slot.hour, 
      minute: slot.minute 
    });
    const endDateTime = slotDateTime.plus({ minutes: 30 });
    onAvailabilityClick(day, slotDateTime, endDateTime);
  }, [onAvailabilityClick]);

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
        {weekBoundaries.days.map((day, index) => (
          <div key={day.toISO()} className="border-r border-gray-200 last:border-r-0">
            <div className="h-16 border-b border-gray-200 flex flex-col items-center justify-center">
              <div className="text-sm font-medium text-gray-900">
                {formatters.getDayName(day)}
              </div>
              <div className={`text-lg font-semibold ${
                formatters.isToday(day) ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {formatters.getDayNumber(day)}
              </div>
            </div>
          </div>
        ))}

        {/* Time slots */}
        {timeSlots.map((slot, slotIndex) => (
          <React.Fragment key={slotIndex}>
            {/* Time label */}
            <div className="border-r border-gray-200 h-12 flex items-center justify-end pr-2 text-xs text-gray-500">
              {slot.minute === 0 ? formatters.formatTimeSlot(slot.hour, slot.minute) : ''}
            </div>

            {/* Day cells */}
            {weekBoundaries.days.map((day, dayIndex) => (
              <div
                key={`${slotIndex}-${dayIndex}`}
                className="border-r border-b border-gray-100 h-12 hover:bg-gray-50 cursor-pointer transition-colors last:border-r-0"
                onClick={() => handleCellClick(day, slot)}
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
