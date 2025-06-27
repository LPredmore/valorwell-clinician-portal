
import React from 'react';
import DayCell from './DayCell';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { DayAvailabilityData } from '@/hooks/useMonthViewData';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';

interface CalendarGridProps {
  days: DateTime[];
  monthStart: DateTime;
  dayAvailabilityMap: Map<string, DayAvailabilityData>;
  dayAppointmentsMap: Map<string, Appointment[]>;
  availabilityByDay: Map<string, AvailabilityBlock[]>;
  getClientName: (clientId: string) => string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onAvailabilityClick?: (day: DateTime, availabilityBlock: AvailabilityBlock) => void;
  userTimeZone?: string;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  monthStart,
  dayAvailabilityMap,
  dayAppointmentsMap,
  availabilityByDay,
  getClientName,
  onAppointmentClick,
  onAvailabilityClick,
  userTimeZone = 'America/Chicago'
}) => {
  const weekDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="grid grid-cols-7 gap-1">
      {weekDayNames.map((day) => (
        <div key={day} className="p-2 text-center font-medium border-b border-gray-200">
          {day.slice(0, 3)}
        </div>
      ))}

      {days.map((day) => {
        const dateStr = TimeZoneService.formatDate(day, 'yyyy-MM-dd');
        const dayAppointments = dayAppointmentsMap.get(dateStr) || [];
        const dayAvailability = dayAvailabilityMap.get(dateStr) || {
          hasAvailability: false,
          displayHours: ''
        };
        // Get the first availability block from the array, if any exist
        const availabilityBlocks = availabilityByDay.get(dateStr) || [];
        const firstAvailability = availabilityBlocks.length > 0 ? availabilityBlocks[0] : undefined;
        
        // Enhanced logging for debugging
        console.log(`[CalendarGrid] Processing day ${dateStr} in time zone ${userTimeZone}`);
        console.log(`[CalendarGrid] UTC day: ${day.toUTC().toString()}, Local day: ${day.toString()}`);
        console.log(`[CalendarGrid] Month start (UTC): ${monthStart.toUTC().toString()}`);
        
        if (dayAppointments.length > 0) {
          console.log(`[CalendarGrid] Day ${dateStr} has ${dayAppointments.length} appointments:`,
            dayAppointments.map(app => ({
              id: app.id,
              client: app.clientName,
              start_at_utc: app.start_at,
              start_at_local: TimeZoneService.convertUTCToLocal(app.start_at, userTimeZone)
            }))
          );
        }
        
        return (
          <DayCell
            key={day.toString()}
            day={day}
            monthStart={monthStart}
            availabilityInfo={dayAvailability}
            appointments={dayAppointments}
            getClientName={getClientName}
            onAppointmentClick={onAppointmentClick}
            onAvailabilityClick={onAvailabilityClick}
            firstAvailability={firstAvailability}
          />
        );
      })}
    </div>
  );
};

export default CalendarGrid;
