
import React, { useState, useMemo, useCallback } from 'react';
import { useWeekViewDataSimplified } from './week-view/useWeekViewDataSimplified';
import { TimeBlock, AppointmentBlock } from './week-view/types';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './week-view/TimeSlot';
import { AvailabilityBlock } from '@/types/availability';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import { Appointment } from '@/types/appointment';
import CalendarErrorBoundary from './CalendarErrorBoundary';
import { useTimeRange } from '@/hooks/useTimeRange';

interface WeekViewProps {
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
  clinicianTimeZone: string;
  showAvailability?: boolean;
  refreshTrigger?: number;
  appointments?: any[];
  onAppointmentClick?: (appointment: any) => void;
  onAvailabilityClick?: (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => void;
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  currentDate?: Date;
  isLoading?: boolean;
  error?: any;
  onAppointmentDelete?: (appointmentId: string) => void;
}

const INTERVAL_MINUTES = 30;

const WeekView: React.FC<WeekViewProps> = React.memo(({
  days,
  selectedClinicianId,
  userTimeZone,
  clinicianTimeZone,
  showAvailability = true,
  refreshTrigger = 0,
  appointments = [],
  onAppointmentClick,
  onAvailabilityClick,
  currentDate,
  onAppointmentUpdate,
  onAppointmentDelete,
  isLoading,
  error,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] = useState(false);
  
  // Validate and normalize timezone values with memoization
  const validClinicianTimeZone = useMemo(() => {
    if (!clinicianTimeZone) {
      return 'UTC';
    }
    
    try {
      DateTime.now().setZone(clinicianTimeZone);
      return clinicianTimeZone;
    } catch (error) {
      return 'UTC';
    }
  }, [clinicianTimeZone]);
  
  const validUserTimeZone = useMemo(() => {
    return TimeZoneService.ensureIANATimeZone(userTimeZone);
  }, [userTimeZone]);

  // Memoize the days array conversion to prevent unnecessary recalculations
  const memoizedDays = useMemo(() => days, [days.map(d => d.getTime()).join(',')]);

  // Always call hooks at the top level - create stable callbacks
  const getClientNameCallback = useCallback((id: string) => `Client ${id}`, []);

  // Use useWeekViewDataSimplified with correct parameters and memoized dependencies
  const {
    loading: hookLoading,
    error: hookError,
    weekDays,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  } = useWeekViewDataSimplified(
    memoizedDays,
    selectedClinicianId,
    refreshTrigger,
    appointments,
    getClientNameCallback,
    validUserTimeZone,
    validClinicianTimeZone
  );

  // Calculate dynamic time range based on actual data with memoization
  const { startHour, endHour } = useTimeRange({
    appointmentBlocks: appointmentBlocks || [],
    timeBlocks: timeBlocks || [],
    weekDays: weekDays || []
  });

  // Generate timezone-aware TIME_SLOTS using dynamic range and clinician's timezone with memoization
  const TIME_SLOTS = useMemo(() => {
    const slots: DateTime[] = [];
    // Create a base date in the clinician's timezone (today at midnight)
    const baseDate = DateTime.now().setZone(validClinicianTimeZone).startOf('day');
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
        const slot = baseDate.set({ hour, minute, second: 0, millisecond: 0 });
        slots.push(slot);
      }
    }
    
    return slots;
  }, [validClinicianTimeZone, startHour, endHour]);

  // Always call useCallback at top level - handle availability block click
  const handleAvailabilityBlockClick = useCallback((day: Date, block: TimeBlock) => {
    // Convert Date to DateTime internally for processing
    const dayDt = TimeZoneService.fromJSDate(day, validClinicianTimeZone);
    setSelectedBlock(block);
    
    // Call the parent's onAvailabilityClick if provided
    if (onAvailabilityClick) {
      // Convert the TimeBlock to AvailabilityBlock format before passing to the parent handler
      const availabilityBlock: AvailabilityBlock = {
        id: block.availabilityIds?.[0] || 'unknown',
        clinician_id: selectedClinicianId || '',
        start_at: block.start.toUTC().toISO(),
        end_at: block.end.toUTC().toISO(),
        is_active: true
      };
      
      onAvailabilityClick(day, availabilityBlock);
    }
  }, [validClinicianTimeZone, selectedClinicianId, onAvailabilityClick]);

  // Always call useCallback at top level - handle appointment click
  const handleAppointmentClick = useCallback((appointment: AppointmentBlock) => {
    // Find the complete original appointment with all data
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      if (onAppointmentClick) {
        onAppointmentClick(originalAppointment);
      }
    } else {
      const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments || []);
      if (onAppointmentClick) {
        onAppointmentClick(fullAppointment);
      }
    }
  }, [appointments, onAppointmentClick]);

  // Always call useCallback at top level - format time
  const formatTime = useCallback((timeSlot: DateTime) => {
    return timeSlot.toFormat('h:mm a');
  }, []);

  // Memoize the loading and error states
  if (hookLoading || isLoading) {
    return <div className="flex justify-center items-center h-32">Loading calendar...</div>;
  }

  if (hookError || error) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-center text-red-600">
          <p>Error loading calendar: {hookError?.toString() || error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <CalendarErrorBoundary>
      <div className="flex flex-col">
        {/* Time column headers */}
        <div className="flex">
          {/* Time label column header - add matching width to align with time labels */}
          <div className="w-16 flex-shrink-0"></div>
          {/* Day headers - use exact same width as the day columns below */}
          {weekDays.map(day => (
            <div 
              key={day.toISO()} 
              className="w-24 flex-1 px-2 py-1 font-semibold text-center border-r last:border-r-0"
            >
              <div className="text-sm">{day.toFormat('EEE')}</div>
              <div className="text-xs">{day.toFormat('MMM d')}</div>
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        <div className="flex">
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0">
            {TIME_SLOTS.map((timeSlot, i) => (
              <div key={i} className="h-10 flex items-center justify-end pr-2 text-xs text-gray-500">
                {formatTime(timeSlot)}
              </div>
            ))}
          </div>

          {/* Days columns */}
          {weekDays.map(day => (
            <div key={day.toISO() || ''} className="flex-1 border-r last:border-r-0">
              {TIME_SLOTS.map((timeSlot, i) => {
                // Create the specific time slot for this day and time
                const dayTimeSlot = day.set({
                  hour: timeSlot.hour,
                  minute: timeSlot.minute,
                  second: 0,
                  millisecond: 0
                });
                
                // Check availability and appointments
                const isAvailable = showAvailability && isTimeSlotAvailable(dayTimeSlot);
                const currentBlock = isAvailable ? getBlockForTimeSlot(dayTimeSlot) : undefined;
                const appointment = getAppointmentForTimeSlot(dayTimeSlot);
                
                // Determine if this is the start of a block or appointment
                const isStartOfBlock = currentBlock &&
                  timeSlot.toFormat('HH:mm') === currentBlock.start.toFormat('HH:mm');
                
                const isStartOfAppointment = appointment &&
                  timeSlot.toFormat('HH:mm') === appointment.start.toFormat('HH:mm');

                return (
                  <div
                    key={i}
                    className={`h-10 border-b border-l first:border-l-0 group 
                                ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    <TimeSlot
                      day={day.toJSDate()}
                      timeSlot={timeSlot.toJSDate()}
                      isAvailable={isAvailable}
                      currentBlock={currentBlock}
                      appointment={appointment}
                      isStartOfBlock={!!isStartOfBlock}
                      isEndOfBlock={false}
                      isStartOfAppointment={!!isStartOfAppointment}
                      isEndOfAppointment={false}
                      handleAvailabilityBlockClick={handleAvailabilityBlockClick}
                      onAppointmentClick={handleAppointmentClick}
                      onAppointmentDragStart={() => {}}
                      onAppointmentDragOver={() => {}}
                      onAppointmentDrop={() => {}}
                      originalAppointments={appointments}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </div>
    </CalendarErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for WeekView memo
  return (
    prevProps.selectedClinicianId === nextProps.selectedClinicianId &&
    prevProps.userTimeZone === nextProps.userTimeZone &&
    prevProps.clinicianTimeZone === nextProps.clinicianTimeZone &&
    prevProps.showAvailability === nextProps.showAvailability &&
    prevProps.refreshTrigger === nextProps.refreshTrigger &&
    prevProps.isLoading === nextProps.isLoading &&
    JSON.stringify(prevProps.error) === JSON.stringify(nextProps.error) &&
    prevProps.appointments?.length === nextProps.appointments?.length &&
    prevProps.days.length === nextProps.days.length &&
    prevProps.days.every((day, index) => day.getTime() === nextProps.days[index]?.getTime())
  );
});

WeekView.displayName = 'WeekView';

export default WeekView;
