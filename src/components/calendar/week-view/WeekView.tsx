
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useWeekViewData } from './useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './TimeSlot';
import { AvailabilityBlock } from '@/types/availability';
import { Appointment } from '@/types/appointment';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';

interface WeekViewProps {
  days: Date[] | null;
  selectedClinicianId: string | null;
  userTimeZone: string;
  showAvailability?: boolean;
  refreshTrigger?: number;
  appointments?: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onAvailabilityClick?: (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => void;
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  onAppointmentDelete?: (appointmentId: string) => void;
  currentDate?: Date;
  isLoading?: boolean;
  error?: any;
}

const START_HOUR = 7;
const END_HOUR = 19;
const INTERVAL_MINUTES = 30;
const TIME_SLOTS: Date[] = [];
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0);
for (let hour = START_HOUR; hour < END_HOUR; hour++) {
  for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
    const slot = new Date(baseDate);
    slot.setHours(hour, minute, 0, 0);
    TIME_SLOTS.push(slot);
  }
}

const WeekView: React.FC<WeekViewProps> = (props) => {
  // Safely destructure props with defaults
  const {
    days: rawDays,
    selectedClinicianId,
    userTimeZone,
    showAvailability = true,
    refreshTrigger = 0,
    appointments = [],
    onAppointmentClick,
    onAvailabilityClick,
    onAppointmentUpdate,
    onAppointmentDelete,
    currentDate,
    isLoading,
    error,
  } = props;

  // Ensure days is always an array
  const days = Array.isArray(rawDays) ? rawDays : [];
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);

  const {
    loading,
    weekDays,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  } = useWeekViewData(
    days,
    selectedClinicianId,
    refreshTrigger,
    appointments,
    (id: string) => `Client ${id}`,
    userTimeZone
  );

  // Handle click on an availability block
  const handleAvailabilityBlockClick = (day: Date, block: any) => {
    console.log('Availability block clicked:', {
      day: format(day, 'yyyy-MM-dd'),
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
  const handleAppointmentClick = (appointment: any) => {
    // Enhanced logging to debug appointment data
    console.log('[WeekView] Appointment clicked:', {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.client_id,
      hasClient: !!appointment.client,
      start_at: appointment.start_at,
      end_at: appointment.end_at
    });
    
    // Find the complete original appointment with all data
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      console.log(`[WeekView] Found original appointment with complete data`);
      // Call the parent's onAppointmentClick with the complete appointment data
      if (onAppointmentClick) {
        onAppointmentClick(originalAppointment);
      }
    } else {
      console.warn(`[WeekView] Original appointment not found, converting to full appointment`);
      // Convert to a full appointment object if the original can't be found
      const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments || []);
      console.log(`[WeekView] Using converted appointment:`, {
        id: fullAppointment.id,
        clientName: fullAppointment.clientName,
        clientId: fullAppointment.client_id,
        hasClient: !!fullAppointment.client,
        start_at: fullAppointment.start_at,
        end_at: fullAppointment.end_at
      });
      
      // Call the parent's onAppointmentClick with the converted appointment
      if (onAppointmentClick) {
        onAppointmentClick(fullAppointment);
      }
    }
  };
  
  // Handle appointment drag start
  const handleAppointmentDragStart = (appointment: any, event: React.DragEvent) => {
    console.log('[WeekView] Appointment drag started:', {
      id: appointment.id,
      clientName: appointment.clientName
    });
    setDraggedAppointmentId(appointment.id);
    
    // Set consistent drag data with both id and appointmentId for compatibility
    try {
      const dragData = {
        id: appointment.id,
        appointmentId: appointment.id,
        clientName: appointment.clientName
      };
      event.dataTransfer.setData('application/json', JSON.stringify(dragData));
    } catch (error) {
      console.error('[WeekView] Error setting drag data:', error);
    }
  };
  
  // Handle drag over a time slot
  const handleAppointmentDragOver = (day: Date, timeSlot: Date, event: React.DragEvent) => {
    event.preventDefault(); // Allow drop
  };
  
  // Handle drop on a time slot
  const handleAppointmentDrop = (day: Date, timeSlot: Date, event: React.DragEvent) => {
    if (!draggedAppointmentId || !onAppointmentUpdate) return;
    
    try {
      // Get the dragged appointment data
      const dragDataJson = event.dataTransfer.getData('application/json');
      console.log('[DROP] dragDataJson:', dragDataJson);
      
      const dragData = JSON.parse(dragDataJson);
      console.log('[DROP] Parsed drag data:', dragData);
      
      // Use either id or appointmentId, whichever is available
      const appointmentId = dragData.id || dragData.appointmentId;
      
      if (!appointmentId) {
        console.error('[DROP] No valid appointmentId found in drag data');
        return;
      }
      
      console.log('[DROP] Using appointmentId:', appointmentId);
      
      // Find the original appointment with more flexible matching
      const appointment = appointments?.find(a => a.id === appointmentId);
      
      console.log('[DROP] Matched appointment object:', appointment);
      
      if (!appointment) {
        console.warn('[DROP] No appointment found for ID:', appointmentId);
      }
      
      if (appointment) {
        // Calculate the duration of the appointment
        const startDateTime = DateTime.fromISO(appointment.start_at);
        const endDateTime = DateTime.fromISO(appointment.end_at);
        const durationMinutes = endDateTime.diff(startDateTime).as('minutes');
        
        // Create new start and end times based on the drop target
        const newStartDateTime = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
        const newEndDateTime = newStartDateTime.plus({ minutes: durationMinutes });
        
        // Convert to UTC ISO strings for the database
        const newStartAt = newStartDateTime.toUTC().toISO();
        const newEndAt = newEndDateTime.toUTC().toISO();
        
        console.log('[DROP] About to update appointment in database:', {
          appointmentId,
          newStartAt,
          newEndAt
        });
        
        // Call the update handler
        try {
          onAppointmentUpdate(appointmentId, newStartAt, newEndAt);
        } catch (error) {
          console.error('[DROP] Error updating appointment in database:', error);
        }
      } else {
        // FALLBACK: Even if we couldn't find the appointment, try to update using the dragData
        console.log('[DROP] Using fallback values from dragData to update appointment');
        
        // Create new start and end times based on the drop target
        const newStartDateTime = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
        // Assume a default duration of 60 minutes if we can't determine it from the appointment
        const newEndDateTime = newStartDateTime.plus({ minutes: 60 });
        
        // Convert to UTC ISO strings for the database
        const newStartAt = newStartDateTime.toUTC().toISO();
        const newEndAt = newEndDateTime.toUTC().toISO();
        
        try {
          onAppointmentUpdate(appointmentId, newStartAt, newEndAt);
        } catch (error) {
          console.error('[DROP] Error updating appointment with fallback values:', error);
        }
      }
    } catch (error) {
      console.error('Error handling appointment drop:', error);
    }
    
    // Reset the dragged appointment ID
    setDraggedAppointmentId(null);
  };

  // Debug function to log all blocks for a specific day
  const debugBlocksForDay = (day: DateTime) => {
    const dayBlocks = timeBlocks.filter(block => 
      block.day && block.day.hasSame(day, 'day')
    );
    
    console.log(`[WeekView DEBUG] Blocks for ${day.toFormat('yyyy-MM-dd')}: ${dayBlocks.length}`, 
      dayBlocks.map(block => ({
        start: block.start.toFormat('HH:mm'),
        end: block.end.toFormat('HH:mm'),
        isException: block.isException
      }))
    );
    
    return dayBlocks;
  };
  
  // Get a formatted time string for display
  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-32">Loading calendar...</div>;
  }

  // Check if we have the day we're looking for (Thursday, May 15, 2025)
  const debugDay = weekDays.find(day => day.toFormat('yyyy-MM-dd') === '2025-05-15');
  if (debugDay) {
    console.log('[WeekView] Found debug day 2025-05-15, showing blocks:');
    debugBlocksForDay(debugDay);
  }

  return (
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
              // Convert JS Date to DateTime objects for consistent checking
              const dayDt = TimeZoneService.fromJSDate(day.toJSDate(), userTimeZone);
              const timeSlotDt = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
              
              // Get formatted day and hour for debugging logs
              const formattedDay = dayDt.toFormat('yyyy-MM-dd');
              const formattedTime = timeSlotDt.toFormat('HH:mm');
              const debugMode = formattedDay === '2025-05-15' && (timeSlotDt.hour >= 8 && timeSlotDt.hour <= 18);
              
              // Perform availability checks and get relevant blocks
              const isAvailable = showAvailability && isTimeSlotAvailable(
                dayDt.toJSDate(), 
                timeSlotDt.toJSDate()
              );
              
              // Get the corresponding block if available - this may be undefined
              const currentBlock = isAvailable ? getBlockForTimeSlot(
                dayDt.toJSDate(), 
                timeSlotDt.toJSDate()
              ) : undefined;
              
              // Get any appointment for this time slot
              const appointment = getAppointmentForTimeSlot(
                dayDt.toJSDate(), 
                timeSlotDt.toJSDate()
              );
              
              // Debug comparison logging
              if (debugMode) {
                // Direct comparison between isTimeSlotAvailable and getBlockForTimeSlot results
                console.log(`[WeekView DEBUG COMPARISON] For ${formattedDay} ${formattedTime}:`);
                console.log(`  isTimeSlotAvailable result: ${isAvailable}`);
                console.log(`  getBlockForTimeSlot result (currentBlock defined): ${!!currentBlock}`);
                if (currentBlock) {
                  console.log(`  getBlockForTimeSlot block details:`, JSON.stringify({
                    start: currentBlock.start.toFormat('HH:mm'),
                    end: currentBlock.end.toFormat('HH:mm'),
                    day: currentBlock.day?.toFormat('yyyy-MM-dd'),
                    isException: currentBlock.isException
                  }));
                }
              }
              
              // Determine if this is the start or end of a block
              const isStartOfBlock = currentBlock && 
                TimeZoneService.fromJSDate(timeSlot, userTimeZone).toFormat('HH:mm') === 
                currentBlock.start.toFormat('HH:mm');
              
              const isEndOfBlock = currentBlock && 
                TimeZoneService.fromJSDate(timeSlot, userTimeZone).plus({ minutes: 30 }).toFormat('HH:mm') === 
                currentBlock.end.toFormat('HH:mm');
              
              const isStartOfAppointment = appointment && 
                TimeZoneService.fromJSDate(timeSlot, userTimeZone).toFormat('HH:mm') === 
                appointment.start.toFormat('HH:mm');
              
              const isEndOfAppointment = appointment && 
                TimeZoneService.fromJSDate(timeSlot, userTimeZone).plus({ minutes: 30 }).toFormat('HH:mm') === 
                appointment.end.toFormat('HH:mm');

              return (
                <div
                  key={i}
                  className={`h-10 border-b border-l first:border-l-0 group 
                              ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <TimeSlot
                    day={dayDt.toJSDate()}
                    timeSlot={timeSlot}
                    isAvailable={isAvailable}
                    currentBlock={currentBlock}
                    appointment={appointment}
                    isStartOfBlock={!!isStartOfBlock}
                    isEndOfBlock={!!isEndOfBlock}
                    isStartOfAppointment={!!isStartOfAppointment}
                    isEndOfAppointment={!!isEndOfAppointment}
                    handleAvailabilityBlockClick={handleAvailabilityBlockClick}
                    onAppointmentClick={handleAppointmentClick}
                    onAppointmentDragStart={handleAppointmentDragStart}
                    onAppointmentDragOver={handleAppointmentDragOver}
                    onAppointmentDrop={handleAppointmentDrop}
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
          <p>Appointments: {appointmentBlocks.length}</p>
          <p>User Timezone: {userTimeZone}</p>
        </div>
      )}
    </div>
  );
};

export default WeekView;
