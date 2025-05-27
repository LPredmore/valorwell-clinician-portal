
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

interface WeekViewProps {
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
  clinicianTimeZone: string; // Added for proper timezone handling
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

// Generate timezone-aware time slots for the day (30-minute intervals)
const START_HOUR = 7; // 7 AM
const END_HOUR = 19; // 7 PM
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
  
  // CRITICAL FIX: Use clinician's current timezone for calendar grid positioning
  const validClinicianTimeZone = useMemo(() => {
    if (!clinicianTimeZone) {
      console.warn('[WeekView] Missing clinicianTimeZone, falling back to UTC');
      return 'UTC';
    }
    
    try {
      DateTime.now().setZone(clinicianTimeZone);
      console.log('[WeekView] Using validated clinician timezone for calendar grid:', clinicianTimeZone);
      return clinicianTimeZone;
    } catch (error) {
      console.warn('[WeekView] Invalid clinicianTimeZone, falling back to UTC:', error);
      return 'UTC';
    }
  }, [clinicianTimeZone]);
  
  console.log('[WeekView] CRITICAL FIX - Rendering with corrected timezone parameters:', {
    daysCount: days.length,
    appointmentsCount: appointments?.length || 0,
    clinicianId: selectedClinicianId,
    userTimeZone,
    clinicianTimeZone: validClinicianTimeZone,
    isLoading,
    hasError: !!error
  });

  // Generate timezone-aware TIME_SLOTS using clinician's timezone for grid positioning
  const TIME_SLOTS = useMemo(() => {
    console.log('[WeekView] CRITICAL FIX - Generating timezone-aware TIME_SLOTS for clinician timezone:', validClinicianTimeZone);
    
    const slots: DateTime[] = [];
    // Create a base date in the clinician's timezone (today at midnight)
    const baseDate = DateTime.now().setZone(validClinicianTimeZone).startOf('day');
    
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
        const slot = baseDate.set({ hour, minute, second: 0, millisecond: 0 });
        slots.push(slot);
      }
    }
    
    console.log('[WeekView] CRITICAL FIX - Generated timezone-aware TIME_SLOTS:', {
      count: slots.length,
      timezone: validClinicianTimeZone,
      firstSlot: slots[0]?.toFormat('HH:mm'),
      lastSlot: slots[slots.length - 1]?.toFormat('HH:mm'),
      sampleSlot: slots[10]?.toISO() // 10:00 AM slot for reference
    });
    
    return slots;
  }, [validClinicianTimeZone]);

  // CRITICAL FIX: Pass correct timezone parameters
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
    validClinicianTimeZone, // Use clinician timezone for grid positioning
    validClinicianTimeZone  // Use clinician timezone for data processing
  );

  // PHASE 4: Add comprehensive data validation and logging
  console.log('[WeekView] PHASE 4 - Data validation after hook processing:', {
    rawAppointments: appointments?.length || 0,
    processedAppointmentBlocks: appointmentBlocks?.length || 0,
    rawTimeBlocks: timeBlocks?.length || 0,
    weekDaysGenerated: weekDays?.length || 0,
    isHookLoading: hookLoading,
    hookError: hookError?.toString()
  });

  // Log sample processed data for debugging
  if (appointmentBlocks?.length > 0) {
    console.log('[WeekView] PHASE 4 - Sample processed appointment block:', {
      id: appointmentBlocks[0].id,
      originalStart: appointmentBlocks[0].start_at,
      originalTimezone: appointmentBlocks[0].appointment_timezone,
      processedStart: appointmentBlocks[0].start.toFormat('yyyy-MM-dd HH:mm'),
      processedTimezone: appointmentBlocks[0].start.zoneName,
      clientName: appointmentBlocks[0].clientName
    });
  }

  if (timeBlocks?.length > 0) {
    console.log('[WeekView] PHASE 4 - Sample processed time block:', {
      start: timeBlocks[0].start.toFormat('yyyy-MM-dd HH:mm'),
      end: timeBlocks[0].end.toFormat('yyyy-MM-dd HH:mm'),
      timezone: timeBlocks[0].start.zoneName,
      availabilityIds: timeBlocks[0].availabilityIds
    });
  }

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
    
    if (onAvailabilityClick) {
      const availabilityBlock: AvailabilityBlock = {
        id: block.availabilityIds?.[0] || 'unknown',
        clinician_id: selectedClinicianId || '',
        start_at: block.start.toUTC().toISO(),
        end_at: block.end.toUTC().toISO(),
        is_active: true
      };
      
      onAvailabilityClick(dayDt.toJSDate(), availabilityBlock);
    }
  };

  // Handle click on an appointment block
  const handleAppointmentClick = (appointment: any) => {
    console.log('[WeekView] Appointment clicked:', {
      id: appointment.id,
      clientName: appointment.clientName,
      start_at: appointment.start_at,
      end_at: appointment.end_at,
      appointment_timezone: appointment.appointment_timezone
    });
    
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      setSelectedAppointment(originalAppointment);
    } else {
      const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments || []);
      setSelectedAppointment(fullAppointment);
    }
    setIsAppointmentDetailsOpen(true);
    
    if (onAppointmentClick) {
      onAppointmentClick(originalAppointment || appointment);
    }
  };

  // Get a formatted time string for display
  const formatTime = (timeSlot: DateTime) => {
    return timeSlot.toFormat('h:mm a');
  };

  if (hookLoading || isLoading) {
    return <div className="flex justify-center items-center h-32">Loading calendar...</div>;
  }

  if (hookError || error) {
    console.error('[WeekView] CRITICAL ERROR - Calendar data loading failed:', {
      hookError,
      error: error?.message || error,
      appointmentsCount: appointments?.length || 0,
      selectedClinicianId
    });
    return (
      <div className="flex justify-center items-center h-32 text-red-600">
        Error loading calendar: {hookError || error?.message || 'Unknown error'}
      </div>
    );
  }

  // PHASE 4: Validate data before rendering
  if (!weekDays || weekDays.length === 0) {
    console.error('[WeekView] CRITICAL ERROR - No week days generated');
    return <div className="flex justify-center items-center h-32 text-red-600">No calendar days available</div>;
  }

  if (!TIME_SLOTS || TIME_SLOTS.length === 0) {
    console.error('[WeekView] CRITICAL ERROR - No time slots generated');
    return <div className="flex justify-center items-center h-32 text-red-600">No time slots available</div>;
  }

  console.log('[WeekView] PHASE 4 - Final validation passed, rendering calendar with:', {
    weekDays: weekDays.length,
    timeSlots: TIME_SLOTS.length,
    appointmentBlocks: appointmentBlocks.length,
    timeBlocks: timeBlocks.length
  });

  return (
    <CalendarErrorBoundary>
      <div className="flex flex-col">
        {/* AppointmentDetailsDialog */}
        <AppointmentDetailsDialog 
          isOpen={isAppointmentDetailsOpen}
          onClose={() => {
            setIsAppointmentDetailsOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onAppointmentUpdated={() => {
            if (onAppointmentUpdate) {
              onAppointmentUpdate("refresh-trigger", "", "");
            }
            setIsAppointmentDetailsOpen(false);
            setSelectedAppointment(null);
          }}
          userTimeZone={validClinicianTimeZone}
        />

        {/* Time column headers */}
        <div className="flex">
          <div className="w-16 flex-shrink-0"></div>
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
                // Use clinician timezone for grid positioning
                const dayDt = day;
                const timeSlotDt = timeSlot;
                
                // Create the specific time slot for this day by combining day and time
                const dayTimeSlot = dayDt.set({
                  hour: timeSlotDt.hour,
                  minute: timeSlotDt.minute,
                  second: 0,
                  millisecond: 0
                });
                
                // PHASE 4: Enhanced debug logging for timezone operations
                console.log(`[WeekView] PHASE 4 - Processing slot ${dayDt.toFormat('yyyy-MM-dd')} ${timeSlotDt.toFormat('HH:mm')} in clinician timezone:`, {
                  dayDt: dayDt.toISO(),
                  timeSlotDt: timeSlotDt.toISO(),
                  combinedDayTimeSlot: dayTimeSlot.toISO(),
                  timezone: validClinicianTimeZone,
                  timezoneValid: dayTimeSlot.zoneName === validClinicianTimeZone
                });
                
                // Pass Luxon DateTime objects to all functions
                const isAvailable = showAvailability && isTimeSlotAvailable(dayTimeSlot);
                
                const currentBlock = isAvailable ? getBlockForTimeSlot(dayTimeSlot) : undefined;
                
                const appointment = getAppointmentForTimeSlot(dayTimeSlot);

                // PHASE 4: Enhanced debug logging for appointment positioning
                if (appointment) {
                  console.log(`[WeekView] PHASE 4 - Appointment found at ${dayDt.toFormat('yyyy-MM-dd')} ${timeSlotDt.toFormat('HH:mm')} in clinician timezone:`, {
                    appointmentId: appointment.id,
                    originalTimezone: appointment.appointment_timezone,
                    originalStart: appointment.start_at,
                    convertedStart: appointment.start.toFormat('yyyy-MM-dd HH:mm'),
                    clinicianTimeZone: validClinicianTimeZone,
                    slotTime: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm')
                  });
                }

                return (
                  <div
                    key={i}
                    className={`h-10 border-b border-l first:border-l-0 group 
                                ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    <TimeSlot
                      day={dayTimeSlot.toJSDate()}
                      timeSlot={timeSlotDt.toJSDate()}
                      isAvailable={isAvailable}
                      currentBlock={currentBlock}
                      appointment={appointment}
                      isStartOfBlock={false}
                      isEndOfBlock={false}
                      isStartOfAppointment={false}
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
            <h3 className="text-lg font-semibold">CRITICAL FIX - Debug Info</h3>
            <p>Clinician ID: {selectedClinicianId || 'None'}</p>
            <p>Clinician Timezone: {validClinicianTimeZone}</p>
            <p>User Timezone: {userTimeZone}</p>
            <p>Time Blocks: {timeBlocks.length}</p>
            <p>Appointments: {appointmentBlocks.length}</p>
            <p>TIME_SLOTS Generated: {TIME_SLOTS.length} (all Luxon DateTime in {validClinicianTimeZone})</p>
            {appointmentBlocks.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Appointment Display Info:</p>
                {appointmentBlocks.slice(0, 3).map(apt => (
                  <p key={apt.id} className="text-sm">
                    {apt.clientName}: Original timezone: {apt.appointment_timezone || 'None'}, 
                    Positioned in: {validClinicianTimeZone}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-2">
              <p className="font-medium">CRITICAL FIX - Timezone Flow Check:</p>
              <p className="text-sm">
                Calendar grid positioning: {validClinicianTimeZone} | 
                Data processing timezone: {validClinicianTimeZone}
              </p>
            </div>
          </div>
        )}
      </div>
    </CalendarErrorBoundary>
  );
};

export default WeekView;
