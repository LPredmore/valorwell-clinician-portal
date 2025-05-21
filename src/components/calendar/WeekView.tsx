
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useWeekViewData } from './week-view/useWeekViewData';
import { TimeBlock, AppointmentBlock } from './week-view/types';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './week-view/TimeSlot';
import { Button } from '@/components/ui/button';
import { AvailabilityBlock } from '@/types/availability';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import { Appointment } from '@/types/appointment';

interface WeekViewProps {
  view?: 'week' | 'month';
  showAvailability: boolean;
  clinicianId: string | null;
  selectedClinicianId?: string | null;
  userTimeZone: string;
  refreshTrigger?: number;
  appointments?: any[];
  onAppointmentClick?: (appointment: any) => void;
  onAvailabilityClick?: (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => void;
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  currentDate?: Date;
  isLoading?: boolean;
  error?: any;
  onAppointmentDelete?: (appointmentId: string) => void;
  days: Date[];
}

// Generate time slots for the day (30-minute intervals)
// These will remain constant across renders
const START_HOUR = 7; // 7 AM
const END_HOUR = 19; // 7 PM
const INTERVAL_MINUTES = 30;

const TIME_SLOTS: Date[] = [];
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0); // Reset to midnight

for (let hour = START_HOUR; hour < END_HOUR; hour++) {
  for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
    const timeSlot = new Date(baseDate);
    timeSlot.setHours(hour, minute, 0, 0);
    TIME_SLOTS.push(timeSlot);
  }
}

const WeekView: React.FC<WeekViewProps> = ({
  days,
  selectedClinicianId,
  userTimeZone,
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

  // Handle click on an appointment 
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
    
    // Ensure we're passing the complete original appointment
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      console.log(`[WeekView] Found original appointment with complete data`);
      if (onAppointmentClick) {
        onAppointmentClick(originalAppointment);
      }
    } else {
      console.warn(`[WeekView] Original appointment not found, converting to full appointment`);
      // Convert to a full appointment object if it's not already
      const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments || []);
      console.log(`[WeekView] Using converted appointment:`, {
        id: fullAppointment.id,
        clientName: fullAppointment.clientName,
        clientId: fullAppointment.client_id,
        hasClient: !!fullAppointment.client,
        start_at: fullAppointment.start_at,
        end_at: fullAppointment.end_at
      });
      
      // Pass the appointment to the parent component
      if (onAppointmentClick) {
        onAppointmentClick(fullAppointment);
      }
    }
  };

  // Handle availability block click
  const handleAvailabilityBlockClick = (day: Date, block: TimeBlock) => {
    console.log('Availability block clicked:', {
      day: format(day, 'yyyy-MM-dd'),
      start: block.start.toFormat('HH:mm'),
      end: block.end.toFormat('HH:mm'),
    });
    
    // Call the parent's onAvailabilityClick if provided
    if (onAvailabilityClick) {
      // Convert the TimeBlock to AvailabilityBlock format before passing to the parent handler
      const availabilityBlock: AvailabilityBlock = {
        id: block.availabilityIds[0] || 'unknown',
        clinician_id: selectedClinicianId || '',
        start_at: block.start.toUTC().toISO(),
        end_at: block.end.toUTC().toISO(),
        is_active: true
      };
      
      onAvailabilityClick(day, availabilityBlock);
    }
  };
  
  // Handle appointment drag start
  const handleAppointmentDragStart = (appointment: any, event: React.DragEvent) => {
    console.log('Appointment drag started:', appointment);
    setDraggedAppointmentId(appointment.id);
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
      
      const appointmentId = dragData.appointmentId;
      
      // Find the original appointment with more flexible matching
      const appointment = appointments?.find(a => 
        a.id === appointmentId || a.appointmentId === appointmentId
      );
      
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
        
        // Call the update handler - without using .catch()
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

  if (loading) {
    return <div className="flex justify-center items-center h-32">Loading calendar...</div>;
  }

  // Check if we have the day we're looking for (Thursday, May 15, 2025)
  const debugDay = weekDays.find(day => day.toFormat('yyyy-MM-dd') === '2025-05-15');
  if (debugDay) {
    console.log('[WeekView] Found debug day 2025-05-15, showing blocks:');
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
              {format(timeSlot, 'h:mm a')}
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
                    isStartOfBlock={isStartOfBlock}
                    isEndOfBlock={isEndOfBlock}
                    isStartOfAppointment={isStartOfAppointment}
                    isEndOfAppointment={isEndOfAppointment}
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
