
import React from 'react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { DayAvailabilityData } from '@/hooks/useMonthViewData';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';

interface DayCellProps {
  day: DateTime;
  monthStart: DateTime;
  availabilityInfo: DayAvailabilityData;
  appointments: Appointment[];
  firstAvailability?: AvailabilityBlock;
  getClientName: (clientId: string) => string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onAvailabilityClick?: (day: DateTime, availabilityBlock: AvailabilityBlock) => void;
  userTimeZone?: string;
}

const DayCell: React.FC<DayCellProps> = ({
  day,
  monthStart,
  availabilityInfo,
  appointments,
  firstAvailability,
  getClientName,
  onAppointmentClick,
  onAvailabilityClick,
  userTimeZone = 'America/Chicago'
}) => {
  const isCurrentMonth = day.hasSame(monthStart, 'month');
  const dayNum = day.day.toString();
  
  // Get today's date in the user's timezone
  const today = DateTime.now().setZone(userTimeZone);
  const isToday = day.hasSame(today, 'day');

  // Format time function for appointment display
  const formatAppointmentTime = (appointment: Appointment): string => {
    if (!appointment.start_at) return 'N/A';
    try {
      const startDateTime = TimeZoneService.fromUTC(appointment.start_at, userTimeZone);
      return TimeZoneService.formatTime(startDateTime);
    } catch (error) {
      console.error('[DayCell] Error formatting appointment time:', error);
      return 'N/A';
    }
  };

  const handleAvailabilityClick = () => {
    if (availabilityInfo.hasAvailability && firstAvailability && onAvailabilityClick) {
      onAvailabilityClick(day, firstAvailability);
    }
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 p-1 min-h-[100px] transition-colors',
        {
          'bg-gray-50': !isCurrentMonth,
          'bg-blue-50': isToday,
        }
      )}
    >
      <div className="flex justify-between items-start">
        <div className={cn(
          'text-sm font-medium p-1 h-6 w-6 flex items-center justify-center rounded-full',
          {
            'text-gray-400': !isCurrentMonth,
            'bg-blue-500 text-white': isToday,
          }
        )}>
          {dayNum}
        </div>
        
        {availabilityInfo.hasAvailability && (
          <div 
            className="text-xs bg-green-100 text-green-800 px-1 rounded cursor-pointer hover:bg-green-200"
            onClick={handleAvailabilityClick}
          >
            {availabilityInfo.displayHours || 'Available'}
          </div>
        )}
      </div>
      
      <div className="mt-1 space-y-1">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="text-[10px] bg-blue-100 text-blue-800 p-1 rounded truncate cursor-pointer hover:bg-blue-200"
            onClick={() => onAppointmentClick && onAppointmentClick(appointment)}
          >
            <div className="font-medium">{formatAppointmentTime(appointment)}</div>
            <div className="truncate font-medium">{appointment.clientName || 'Unknown Client'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DayCell;
