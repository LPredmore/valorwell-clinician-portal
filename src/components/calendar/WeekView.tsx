
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
import AppointmentDetailsDialog from './AppointmentDetailsDialog';
import { Appointment } from '@/types/appointment';

interface WeekViewProps {
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
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

// Generate time slots for the day (30-minute intervals)
const START_HOUR = 7; // 7 AM
const END_HOUR = 19; // 7 PM
const INTERVAL_MINUTES = 30;

const TIME_SLOTS: Date[] = [];
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0); // Reset to midnight

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

  console.log('[WeekView] Rendering with appointments:', appointments?.length || 0);
  console.log('[WeekView] Sample appointments:', appointments?.slice(0, 3));

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
    
    if (onAvailabilityClick) {
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

  // Handle click on an appointment block
  const handleAppointmentClick = (appointment: any) => {
    console.log('[WeekView] Appointment clicked:', {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.clientId,
      start: appointment.start?.toISO?.() || appointment.start_at,
      end: appointment.end?.toISO?.() || appointment.end_at
    });
    
    // Find the complete original appointment with all data
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      console.log('[WeekView] Found original appointment with complete data');
      if (onAppointmentClick) {
        onAppointmentClick(originalAppointment);
      }
    } else {
      console.warn('[WeekView] Original appointment not found, using appointment block data');
      if (onAppointmentClick) {
        onAppointmentClick(appointment);
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
      const dragDataJson = event.dataTransfer.getData('application/json');
      const dragData = JSON.parse(dragDataJson);
      const appointmentId = dragData.id || dragData.appointmentId;
      
      if (!appointmentId) {
        console.error('[DROP] No valid appointmentId found in drag data');
        return;
      }
      
      const appointment = appointments?.find(a => a.id === appointmentId);
      
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
        
        console.log('[DROP] Updating appointment:', {
          appointmentId,
          newStartAt,
          newEndAt
        });
        
        onAppointmentUpdate(appointmentId, newStartAt, newEndAt);
      }
    } catch (error) {
      console.error('Error handling appointment drop:', error);
    }
    
    setDraggedAppointmentId(null);
  };

  // Get a formatted time string for display
  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-32">Loading calendar...</div>;
  }

  console.log('[WeekView] Rendering calendar with:', {
    weekDays: weekDays.length,
    appointmentBlocks: appointmentBlocks.length,
    timeBlocks: timeBlocks.length
  });

  return (
    <div className="flex flex-col">
      {/* Time column headers */}
      <div className="flex">
        {/* Time label column header */}
        <div className="w-16 flex-shrink-0"></div>
        {/* Day headers */}
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
              
              // Perform availability checks and get relevant blocks
              const isAvailable = showAvailability && isTimeSlotAvailable(
                dayDt.toJSDate(), 
                timeSlotDt.toJSDate()
              );
              
              const currentBlock = isAvailable ? getBlockForTimeSlot(
                dayDt.toJSDate(), 
                timeSlotDt.toJSDate()
              ) : undefined;
              
              // Get any appointment for this time slot
              const appointment = getAppointmentForTimeSlot(
                dayDt.toJSDate(), 
                timeSlotDt.toJSDate()
              );
              
              // Debug appointment data
              if (appointment) {
                console.log('[WeekView] Found appointment for slot:', {
                  day: dayDt.toFormat('yyyy-MM-dd'),
                  time: timeSlotDt.toFormat('HH:mm'),
                  appointmentId: appointment.id,
                  clientName: appointment.clientName,
                  appointmentData: appointment
                });
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
          <p>Original Appointments: {appointments?.length || 0}</p>
        </div>
      )}
    </div>
  );
};

export default WeekView;
