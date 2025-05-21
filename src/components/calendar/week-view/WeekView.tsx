
// WeekView.tsx
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
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
  showAvailability?: boolean;
  refreshTrigger?: number;
  appointments?: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  onAppointmentDelete?: (appointmentId: string) => void;
  currentDate?: Date; // Added missing property
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

const WeekView: React.FC<WeekViewProps> = ({
  days,
  selectedClinicianId,
  userTimeZone,
  showAvailability = true,
  refreshTrigger = 0,
  appointments = [],
  onAppointmentClick,
  onAppointmentUpdate,
  onAppointmentDelete,
  currentDate, // Include the prop in component parameters
}) => {
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);

  const {
    loading,
    weekDays,
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

  const handleAppointmentClick = (appt: Appointment) => {
    console.log(`[WeekView] Appointment clicked:`, {
      id: appt.id,
      clientName: appt.clientName,
      clientId: appt.client_id,
      hasClient: !!appt.client,
      start_at: appt.start_at,
      end_at: appt.end_at
    });
    
    // Ensure we're passing the complete original appointment
    const originalAppointment = appointments.find(a => a.id === appt.id);
    
    if (originalAppointment) {
      console.log(`[WeekView] Found original appointment with complete data`);
      if (onAppointmentClick) {
        onAppointmentClick(originalAppointment);
      }
    } else {
      console.warn(`[WeekView] Original appointment not found, converting to full appointment`);
      // Convert to a full appointment object if it's not already
      const fullAppointment = convertAppointmentBlockToAppointment(appt, appointments);
      console.log(`[WeekView] Using converted appointment:`, {
        id: fullAppointment.id,
        clientName: fullAppointment.clientName,
        clientId: fullAppointment.client_id,
        hasClient: !!fullAppointment.client,
        start_at: fullAppointment.start_at,
        end_at: fullAppointment.end_at
      });
      if (onAppointmentClick) {
        onAppointmentClick(fullAppointment);
      }
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
      
      // Fixed: Use the id property consistently, with fallback for legacy code
      const appointmentId = dragData.id || draggedAppointmentId;
      
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

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="flex flex-col">
      <div className="flex">
        <div className="w-16" />
        {weekDays.map(day => (
          <div key={day.toISO()} className="w-24 flex-1 px-2 py-1 text-center border-r">
            <div>{day.toFormat('EEE')}</div>
            <div className="text-sm text-gray-500">{day.toFormat('MMM d')}</div>
          </div>
        ))}
      </div>

      <div className="flex">
        <div className="w-16">
          {TIME_SLOTS.map((slot, i) => (
            <div key={i} className="h-10 flex justify-end items-center pr-2 text-xs text-gray-400">
              {format(slot, 'h:mm a')}
            </div>
          ))}
        </div>
        {weekDays.map(day => (
          <div key={day.toISO()} className="flex-1 border-r">
            {TIME_SLOTS.map((slot, i) => {
              const dayDt = TimeZoneService.fromJSDate(day.toJSDate(), userTimeZone);
              const slotDt = TimeZoneService.fromJSDate(slot, userTimeZone);
              const isAvailable = showAvailability && isTimeSlotAvailable(dayDt.toJSDate(), slotDt.toJSDate());
              const block = isAvailable ? getBlockForTimeSlot(dayDt.toJSDate(), slotDt.toJSDate()) : undefined;
              const appt = getAppointmentForTimeSlot(dayDt.toJSDate(), slotDt.toJSDate());
              const isStartOfBlock = block && slotDt.toFormat('HH:mm') === block.start.toFormat('HH:mm');
              const isEndOfBlock = block && slotDt.plus({ minutes: 30 }).toFormat('HH:mm') === block.end.toFormat('HH:mm');
              const isStartOfAppointment = appt && slotDt.toFormat('HH:mm') === appt.start.toFormat('HH:mm');
              const isEndOfAppointment = appt && slotDt.plus({ minutes: 30 }).toFormat('HH:mm') === appt.end.toFormat('HH:mm');

              return (
                <div key={i} className="h-10 border-b border-l">
                  <TimeSlot
                    day={dayDt.toJSDate()}
                    timeSlot={slot}
                    isAvailable={isAvailable}
                    currentBlock={block}
                    appointment={appt}
                    isStartOfBlock={!!isStartOfBlock}
                    isEndOfBlock={!!isEndOfBlock}
                    isStartOfAppointment={!!isStartOfAppointment}
                    isEndOfAppointment={!!isEndOfAppointment}
                    handleAvailabilityBlockClick={() => {}}
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
    </div>
  );
};

export default WeekView;
