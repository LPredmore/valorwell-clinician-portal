
import React, { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useWeekViewData } from './useWeekViewData';
import TimeSlot from './TimeSlot';
import { Appointment } from '@/types/appointment';
import { TimeBlock } from './types';
import { TimeZoneService } from '@/utils/timeZoneService';
import CalendarErrorMessage from './CalendarErrorMessage';

interface WeekViewProps {
  currentDate: Date;
  clinicianId: string | null;
  refreshTrigger?: number;
  appointments?: Appointment[];
  getClientName?: (clientId: string) => string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onAvailabilityClick?: (day: Date, availabilityBlock: any) => void;
  userTimeZone?: string;
}

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  clinicianId,
  refreshTrigger = 0,
  appointments = [],
  getClientName = () => 'Unknown Client',
  onAppointmentClick,
  onAvailabilityClick,
  userTimeZone = 'America/Chicago'
}) => {
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null);
  
  const {
    loading,
    error,
    weekDays,
    timeSlots,
    availabilityByDay,
    appointmentsByDay
  } = useWeekViewData(
    currentDate,
    clinicianId,
    refreshTrigger,
    appointments,
    userTimeZone
  );

  if (loading) {
    return (
      <Card className="p-4 flex justify-center items-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-valorwell-500 mr-2" />
        <span>Loading calendar...</span>
      </Card>
    );
  }

  if (error) {
    return <CalendarErrorMessage 
      componentName="WeekView"
      error={error} 
    />;
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-8 gap-1">
        {/* Time column header */}
        <div className="p-2 text-center font-medium border-b border-gray-200">
          Time
        </div>
        
        {/* Day headers */}
        {weekDays.map((day) => (
          <div key={day.toString()} className="p-2 text-center font-medium border-b border-gray-200">
            {format(day, 'EEE M/d')}
          </div>
        ))}
        
        {/* Time slots and calendar content */}
        {timeSlots.map((timeSlot) => (
          <React.Fragment key={timeSlot.toISOString()}>
            {/* Time label */}
            <div className="p-1 text-xs text-gray-600 border-r border-gray-100">
              {TimeZoneService.formatTime(DateTime.fromJSDate(timeSlot))}
            </div>
            
            {/* Day cells */}
            {weekDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayAvailability = availabilityByDay.get(dayKey) || [];
              const dayAppointments = appointmentsByDay.get(dayKey) || [];
              
              // Find availability block for this time slot
              const currentBlock = dayAvailability.find(block => {
                const blockStart = DateTime.fromISO(block.start.toISO());
                const blockEnd = DateTime.fromISO(block.end.toISO());
                const slotTime = DateTime.fromJSDate(timeSlot);
                
                return slotTime >= blockStart && slotTime < blockEnd;
              });
              
              // Find appointment for this time slot
              const appointment = dayAppointments.find(appt => {
                const apptStart = DateTime.fromISO(appt.start.toISO());
                const slotTime = DateTime.fromJSDate(timeSlot);
                
                return apptStart.hasSame(slotTime, 'minute');
              });
              
              return (
                <TimeSlot
                  key={`${day.toString()}-${timeSlot.toISOString()}`}
                  day={day}
                  timeSlot={timeSlot}
                  isAvailable={!!currentBlock}
                  currentBlock={currentBlock}
                  appointment={appointment}
                  isStartOfBlock={false}
                  isEndOfBlock={false}
                  isStartOfAppointment={false}
                  handleAvailabilityBlockClick={(day: Date, block: TimeBlock) => {
                    if (onAvailabilityClick) {
                      onAvailabilityClick(day, block);
                    }
                  }}
                  onAppointmentClick={onAppointmentClick}
                  originalAppointments={appointments}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

export default WeekView;
