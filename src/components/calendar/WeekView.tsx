import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useWeekViewDataSimplified } from './week-view/useWeekViewDataSimplified';
import { TimeBlock, AppointmentBlock } from './week-view/types';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './week-view/TimeSlot';
import { Button } from '@/components/ui/button';
import { AvailabilityBlock } from '@/types/availability';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';
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

const WeekView: React.FC<WeekViewProps> = ({
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
  
  // STEP 2: Use clinician's current timezone for calendar grid positioning
  const validClinicianTimeZone = useMemo(() => {
    if (!clinicianTimeZone) {
      console.warn('[WeekView] STEP 2 - Missing clinicianTimeZone, falling back to UTC');
      return 'UTC';
    }
    
    try {
      DateTime.now().setZone(clinicianTimeZone);
      console.log('[WeekView] STEP 2 - Using validated clinician timezone for calendar grid:', clinicianTimeZone);
      return clinicianTimeZone;
    } catch (error) {
      console.warn('[WeekView] STEP 2 - Invalid clinicianTimeZone, falling back to UTC:', error);
      return 'UTC';
    }
  }, [clinicianTimeZone]);
  
  const validUserTimeZone = useMemo(() => {
    return TimeZoneService.ensureIANATimeZone(userTimeZone);
  }, [userTimeZone]);
  
  console.log('[WeekView] RENDERING DEBUG - Initial parameters:', {
    daysCount: days.length,
    appointmentsCount: appointments?.length || 0,
    clinicianId: selectedClinicianId,
    userTimeZone: validUserTimeZone,
    clinicianTimeZone: validClinicianTimeZone,
    isLoading,
    hasError: !!error
  });

  // DEBUGGING: Log raw appointment data received
  console.log('[WeekView] RAW APPOINTMENT DATA:', {
    appointmentsArray: appointments,
    count: appointments?.length || 0,
    isEmpty: !appointments || appointments.length === 0,
    sampleAppointments: appointments?.slice(0, 3).map(apt => ({
      id: apt.id,
      start_at: apt.start_at,
      end_at: apt.end_at,
      appointment_timezone: apt.appointment_timezone,
      clientName: apt.clientName
    })) || []
  });

  // Use useWeekViewDataSimplified with correct parameters
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
    days,
    selectedClinicianId,
    refreshTrigger,
    appointments,
    (id: string) => `Client ${id}`,
    validUserTimeZone,
    validClinicianTimeZone
  );

  // Calculate dynamic time range based on actual data
  const { startHour, endHour } = useTimeRange({
    appointmentBlocks: appointmentBlocks || [],
    timeBlocks: timeBlocks || [],
    weekDays: weekDays || []
  });

  // Generate timezone-aware TIME_SLOTS using dynamic range and clinician's timezone
  const TIME_SLOTS = useMemo(() => {
    console.log('[WeekView] GENERATING DYNAMIC TIME_SLOTS:', {
      startHour,
      endHour,
      timezone: validClinicianTimeZone,
      totalHours: endHour - startHour
    });
    
    const slots: DateTime[] = [];
    // Create a base date in the clinician's timezone (today at midnight)
    const baseDate = DateTime.now().setZone(validClinicianTimeZone).startOf('day');
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
        const slot = baseDate.set({ hour, minute, second: 0, millisecond: 0 });
        slots.push(slot);
      }
    }
    
    console.log('[WeekView] GENERATED DYNAMIC TIME_SLOTS:', {
      count: slots.length,
      timezone: validClinicianTimeZone,
      firstSlot: slots[0]?.toFormat('HH:mm'),
      lastSlot: slots[slots.length - 1]?.toFormat('HH:mm'),
      dynamicRange: `${startHour}:00 - ${endHour}:00`
    });
    
    return slots;
  }, [validClinicianTimeZone, startHour, endHour]);

  // DEBUGGING: Log processed data from hook
  console.log('[WeekView] PROCESSED DATA FROM HOOK:', {
    rawAppointments: appointments?.length || 0,
    processedAppointmentBlocks: appointmentBlocks?.length || 0,
    processedTimeBlocks: timeBlocks?.length || 0,
    weekDaysGenerated: weekDays?.length || 0,
    isHookLoading: hookLoading,
    hookError: hookError?.toString()
  });

  // DEBUGGING: Log detailed appointment blocks if any exist
  if (appointmentBlocks?.length > 0) {
    console.log('[WeekView] DETAILED APPOINTMENT BLOCKS:', appointmentBlocks.map(block => ({
      id: block.id,
      clientName: block.clientName,
      originalStart: block.start_at,
      originalTimezone: block.appointment_timezone,
      processedStart: block.start.toFormat('yyyy-MM-dd HH:mm'),
      processedEnd: block.end.toFormat('yyyy-MM-dd HH:mm'),
      processedTimezone: block.start.zoneName,
      startHour: block.start.hour,
      startMinute: block.start.minute
    })));
  } else {
    console.log('[WeekView] NO APPOINTMENT BLOCKS FOUND - This is likely the issue!');
  }

  // DEBUGGING: Log week days
  console.log('[WeekView] WEEK DAYS:', weekDays.map(day => ({
    date: day.toFormat('yyyy-MM-dd'),
    dayOfWeek: day.toFormat('EEE'),
    timezone: day.zoneName
  })));

  // Handle click on an availability block - now accepts Date object
  const handleAvailabilityBlockClick = (day: Date, block: TimeBlock) => {
    // Convert Date to DateTime internally for processing
    const dayDt = TimeZoneService.fromJSDate(day, validClinicianTimeZone);
    console.log('[WeekView] Availability block clicked:', {
      day: dayDt.toFormat('yyyy-MM-dd'),
      start: block.start.toFormat('HH:mm'),
      end: block.end.toFormat('HH:mm'),
    });
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
  };

  // Handle click on an appointment block - delegate to parent component
  const handleAppointmentClick = (appointment: AppointmentBlock) => {
    console.log('[WeekView] Appointment clicked:', {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.clientId,
      hasClient: !!appointment.client,
      start_at: appointment.start_at,
      end_at: appointment.end_at
    });
    
    // Find the complete original appointment with all data
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      console.log('[WeekView] Found original appointment with complete data');
      if (onAppointmentClick) {
        onAppointmentClick(originalAppointment);
      }
    } else {
      console.warn('[WeekView] Original appointment not found, converting to full appointment');
      const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments || []);
      if (onAppointmentClick) {
        onAppointmentClick(fullAppointment);
      }
    }
  };

  const formatTime = (timeSlot: DateTime) => {
    return timeSlot.toFormat('h:mm a');
  };

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
                // Check for availability and appointments using Luxon DateTime objects
                const dayTimeSlot = day.set({ 
                  hour: timeSlot.hour, 
                  minute: timeSlot.minute, 
                  second: 0, 
                  millisecond: 0 
                });
                
                const isAvailable = showAvailability && isTimeSlotAvailable(dayTimeSlot);
                const currentBlock = isAvailable ? getBlockForTimeSlot(dayTimeSlot) : undefined;
                const appointment = getAppointmentForTimeSlot(dayTimeSlot);
                
                // DEBUGGING: Log appointment matching for specific time slots
                const debugTimeSlot = timeSlot.hour >= 8 && timeSlot.hour <= 18;
                if (debugTimeSlot) {
                  console.log(`[WeekView] TIME SLOT MATCHING DEBUG for ${day.toFormat('yyyy-MM-dd')} ${timeSlot.toFormat('HH:mm')}:`, {
                    dayTimeSlot: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
                    dayTimeSlotISO: dayTimeSlot.toISO(),
                    dayTimeSlotZone: dayTimeSlot.zoneName,
                    isAvailable,
                    hasCurrentBlock: !!currentBlock,
                    hasAppointment: !!appointment,
                    appointmentDetails: appointment ? {
                      id: appointment.id,
                      clientName: appointment.clientName,
                      startTime: appointment.start.toFormat('yyyy-MM-dd HH:mm'),
                      startISO: appointment.start.toISO(),
                      startZone: appointment.start.zoneName
                    } : null
                  });
                  
                  // Log the call to getAppointmentForTimeSlot
                  console.log(`[WeekView] CALLING getAppointmentForTimeSlot with:`, {
                    input: dayTimeSlot.toISO(),
                    result: appointment ? {
                      id: appointment.id,
                      start: appointment.start.toISO(),
                      clientName: appointment.clientName
                    } : 'null'
                  });
                }
                
                // Determine if this is the start or end of a block
                const isStartOfBlock = currentBlock && 
                  timeSlot.toFormat('HH:mm') === currentBlock.start.toFormat('HH:mm');
                
                const isStartOfAppointment = appointment && 
                  timeSlot.toFormat('HH:mm') === appointment.start.toFormat('HH:mm');

                // DEBUGGING: Log when we should be showing an appointment
                if (appointment && debugTimeSlot) {
                  console.log(`[WeekView] SHOULD SHOW APPOINTMENT:`, {
                    timeSlot: timeSlot.toFormat('HH:mm'),
                    appointmentStart: appointment.start.toFormat('HH:mm'),
                    isStartOfAppointment,
                    appointmentId: appointment.id,
                    clientName: appointment.clientName
                  });
                }

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

        {/* Debug section */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="text-lg font-semibold">Debug Info</h3>
            <p>Clinician ID: {selectedClinicianId || 'None'}</p>
            <p>Time Blocks: {timeBlocks.length}</p>
            <p>Appointment Blocks: {appointmentBlocks.length}</p>
            <p>User Timezone: {validUserTimeZone}</p>
            <p>Clinician Timezone: {validClinicianTimeZone}</p>
            <p>Raw Appointments: {appointments?.length || 0}</p>
            <p>Dynamic Time Range: {startHour}:00 - {endHour}:00 ({endHour - startHour} hours)</p>
          </div>
        )}
      </div>
    </CalendarErrorBoundary>
  );
};

export default WeekView;
