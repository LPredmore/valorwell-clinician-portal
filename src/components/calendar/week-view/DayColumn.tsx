import React, { memo } from 'react';
import { DateTime } from 'luxon';
import { TimeBlock, AppointmentBlock } from './types';
import TimeSlot from './TimeSlot';
import { Appointment } from '@/types/appointment';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

interface DayColumnProps {
  day: DateTime;
  timeSlots: Date[];
  isTimeSlotAvailable: (day: Date, timeSlot: Date) => boolean;
  getBlockForTimeSlot: (day: Date, timeSlot: Date) => TimeBlock | undefined;
  getAppointmentForTimeSlot: (day: Date, timeSlot: Date) => AppointmentBlock | undefined;
  handleAvailabilityBlockClick: (day: Date, block: TimeBlock) => void;
  onAppointmentClick?: (appointment: any) => void;
  onAppointmentDragStart?: (appointment: any, event: React.DragEvent) => void;
  onAppointmentDragOver?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  onAppointmentDrop?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  originalAppointments: Appointment[];
}

/**
 * DayColumn component - Renders a single day column with time slots
 * Extracted from WeekView for better separation of concerns
 */
const DayColumn: React.FC<DayColumnProps> = memo(({
  day,
  timeSlots,
  isTimeSlotAvailable,
  getBlockForTimeSlot,
  getAppointmentForTimeSlot,
  handleAvailabilityBlockClick,
  onAppointmentClick,
  onAppointmentDragStart,
  onAppointmentDragOver,
  onAppointmentDrop,
  originalAppointments
}) => {
  // Component name for logging
  const COMPONENT_NAME = 'DayColumn';
  
  // Convert DateTime to JS Date for compatibility with other functions
  const jsDate = day.toJSDate();
  
  // Log render for debugging
  CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'render', {
    day: day.toFormat('yyyy-MM-dd'),
    timeSlotsCount: timeSlots?.length || 0
  });

  return (
    <div className="flex flex-col">
      {timeSlots.map((timeSlot, i) => {
        // Get availability and appointment data for this time slot
        const isAvailable = isTimeSlotAvailable(jsDate, timeSlot);
        const currentBlock = getBlockForTimeSlot(jsDate, timeSlot);
        const appointment = getAppointmentForTimeSlot(jsDate, timeSlot);
        
        // Determine if this is the start or end of a block
        const nextTimeSlot = i < timeSlots.length - 1 ? timeSlots[i + 1] : null;
        const prevTimeSlot = i > 0 ? timeSlots[i - 1] : null;
        
        // Check if this is the start or end of an availability block
        const isStartOfBlock = isAvailable && 
          currentBlock && 
          (!prevTimeSlot || !isTimeSlotAvailable(jsDate, prevTimeSlot) || 
           getBlockForTimeSlot(jsDate, prevTimeSlot)?.availabilityIds.join(',') !== currentBlock.availabilityIds.join(','));
        
        const isEndOfBlock = isAvailable && 
          currentBlock && 
          (!nextTimeSlot || !isTimeSlotAvailable(jsDate, nextTimeSlot) || 
           getBlockForTimeSlot(jsDate, nextTimeSlot)?.availabilityIds.join(',') !== currentBlock.availabilityIds.join(','));
        
        // Check if this is the start or end of an appointment
        const isStartOfAppointment = !!appointment && 
          (!prevTimeSlot || getAppointmentForTimeSlot(jsDate, prevTimeSlot)?.id !== appointment.id);
        
        const isEndOfAppointment = !!appointment && 
          (!nextTimeSlot || getAppointmentForTimeSlot(jsDate, nextTimeSlot)?.id !== appointment.id);
        
        return (
          <div 
            key={`slot-${i}`}
            className="h-12 border-b border-gray-100"
            data-testid={`day-slot-${day.toFormat('yyyy-MM-dd')}-${i}`}
          >
            <TimeSlot
              day={jsDate}
              timeSlot={timeSlot}
              isAvailable={isAvailable}
              currentBlock={currentBlock}
              appointment={appointment}
              isStartOfBlock={isStartOfBlock}
              isEndOfBlock={isEndOfBlock}
              isStartOfAppointment={isStartOfAppointment}
              isEndOfAppointment={isEndOfAppointment}
              handleAvailabilityBlockClick={handleAvailabilityBlockClick}
              onAppointmentClick={onAppointmentClick}
              onAppointmentDragStart={onAppointmentDragStart}
              onAppointmentDragOver={onAppointmentDragOver}
              onAppointmentDrop={onAppointmentDrop}
              originalAppointments={originalAppointments}
            />
          </div>
        );
      })}
    </div>
  );
});

export default DayColumn;