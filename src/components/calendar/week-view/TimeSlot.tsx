import React, { useState, memo, useCallback } from 'react';
import { TimeBlock, AppointmentBlock } from './types';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import CalendarComponentErrorBoundary from './CalendarComponentErrorBoundary';
import CalendarErrorMessage from './CalendarErrorMessage';

// Component name for logging
const COMPONENT_NAME = 'TimeSlot';

// Separate interfaces for better organization
interface TimeSlotBaseProps {
  day: Date;
  timeSlot: Date;
  isAvailable: boolean;
  currentBlock?: TimeBlock;
  appointment?: AppointmentBlock;
  isStartOfBlock: boolean;
  isEndOfBlock: boolean;
  isStartOfAppointment: boolean;
  isEndOfAppointment?: boolean;
  originalAppointments: Appointment[];
}

interface TimeSlotHandlerProps {
  handleAvailabilityBlockClick: (day: Date, block: TimeBlock) => void;
  onAppointmentClick?: (appointmentBlock: any) => void;
  onAppointmentDragStart?: (appointment: any, event: React.DragEvent) => void;
  onAppointmentDragOver?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  onAppointmentDrop?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
}

// Combined interface
interface TimeSlotProps extends TimeSlotBaseProps, TimeSlotHandlerProps {}

/**
 * TimeSlot component - Displays a single time slot in the calendar
 * Optimized with React.memo and better organized code
 */
const TimeSlot: React.FC<TimeSlotProps> = memo(({
  day,
  timeSlot,
  isAvailable,
  currentBlock,
  appointment,
  isStartOfBlock,
  isEndOfBlock,
  isStartOfAppointment,
  isEndOfAppointment = false,
  handleAvailabilityBlockClick,
  onAppointmentClick,
  onAppointmentDragStart,
  onAppointmentDragOver,
  onAppointmentDrop,
  originalAppointments
}) => {
  // State for handling errors
  const [slotError, setSlotError] = useState<Error | null>(null);
  
  // Format date and time for debugging and data attributes
  const formattedDay = new Date(day).toISOString().split('T')[0];
  const slotHour = timeSlot.getHours();
  const slotMinutes = timeSlot.getMinutes();
  const formattedTime = `${slotHour}:${slotMinutes.toString().padStart(2, '0')}`;
  
  // Event handlers with useCallback for better performance
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (onAppointmentDragOver) {
      e.preventDefault();
      onAppointmentDragOver(day, timeSlot, e);
    }
  }, [day, timeSlot, onAppointmentDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (onAppointmentDrop) {
      e.preventDefault();
      onAppointmentDrop(day, timeSlot, e);
    }
  }, [day, timeSlot, onAppointmentDrop]);

  // Handle appointment click with better error handling
  const handleAppointmentClick = useCallback((e: React.MouseEvent) => {
    if (!appointment || !onAppointmentClick) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    try {
      // Log for debugging
      CalendarDebugUtils.log(COMPONENT_NAME, `Looking for appointment with ID: ${appointment.id}`, {
        appointmentId: appointment.id,
        originalAppointmentsCount: originalAppointments?.length || 0
      });
      
      // Find the original appointment with complete data
      const originalAppointment = originalAppointments?.find(a => a.id === appointment.id);
      
      if (originalAppointment) {
        CalendarDebugUtils.log(COMPONENT_NAME, 'Found original appointment', {
          id: originalAppointment.id,
          clientName: originalAppointment.clientName
        });
        
        onAppointmentClick(originalAppointment);
      } else {
        // Convert the AppointmentBlock to a full Appointment object if original not found
        const fullAppointment = convertAppointmentBlockToAppointment(appointment, originalAppointments || []);
        
        CalendarDebugUtils.log(COMPONENT_NAME, 'Using converted appointment', {
          id: fullAppointment.id,
          clientName: fullAppointment.clientName
        });
        
        onAppointmentClick(fullAppointment);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error handling appointment click', err);
      setSlotError(err);
    }
  }, [appointment, originalAppointments, onAppointmentClick]);

  // Handle availability block click
  const handleAvailabilityClick = useCallback(() => {
    if (!currentBlock || !handleAvailabilityBlockClick) return;
    
    try {
      handleAvailabilityBlockClick(day, currentBlock);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error handling availability click', err);
      setSlotError(err);
    }
  }, [currentBlock, day, handleAvailabilityBlockClick]);

  // Handle appointment drag start
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!appointment || !onAppointmentDragStart) return;
    
    try {
      const original = originalAppointments.find(a => a.id === appointment.id) || appointment;
      
      e.dataTransfer.setData('application/json', JSON.stringify({
        appointmentId: original.id,
        clientName: original.clientName
      }));
      
      onAppointmentDragStart(original, e);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error starting drag operation', err);
      setSlotError(err);
    }
  }, [appointment, originalAppointments, onAppointmentDragStart]);

  // Reset error state
  const handleErrorReset = useCallback(() => {
    setSlotError(null);
  }, []);

  // Render error state if there's an error
  if (slotError) {
    return (
      <CalendarErrorMessage
        componentName={COMPONENT_NAME}
        error={slotError}
        message="Error in time slot"
        details="There was a problem with this calendar slot."
        onRetry={handleErrorReset}
        severity="error"
        contextData={{
          componentName: COMPONENT_NAME,
          day: formattedDay,
          time: formattedTime,
          hasAppointment: !!appointment,
          hasAvailability: isAvailable && !!currentBlock
        }}
      />
    );
  }

  // Determine content and styling based on slot type
  let content = null;
  let className = '';
  let title = '';
  let onClick = undefined;
  let draggable = false;
  let onDragStart = undefined;

  // Appointment slot styling and content
  if (appointment) {
    // Base class for appointments
    const baseAppointmentClass = 'p-1 bg-blue-100 border-l-4 border-blue-500 h-full w-full cursor-pointer transition-colors hover:bg-blue-200 z-20 relative';
    
    // Determine position-specific classes
    let positionClass = '';
    const isMiddleOfAppointment = appointment && !isStartOfAppointment && !isEndOfAppointment;
    
    if (isStartOfAppointment) {
      positionClass = 'rounded-t border-t border-r border-l';
      if (!isEndOfAppointment) positionClass += ' border-b-0';
    } else if (isMiddleOfAppointment) {
      positionClass = 'border-r border-l border-t-0 border-b-0';
    } else if (isEndOfAppointment) {
      positionClass = 'rounded-b border-r border-l border-b border-t-0';
    }

    // Set appointment properties
    title = `${appointment.clientName || 'Unknown Client'} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`;
    draggable = true;
    onClick = handleAppointmentClick;
    onDragStart = handleDragStart;

    // Set content based on position in appointment
    if (isStartOfAppointment) {
      className = `${baseAppointmentClass} ${positionClass} text-xs font-medium truncate appointment-start`;
      content = appointment.clientName || 'Unknown Client';
    } else if (isEndOfAppointment) {
      className = `${baseAppointmentClass} ${positionClass} text-xs opacity-75 appointment-end`;
      content = '\u00A0';
    } else {
      className = `${baseAppointmentClass} ${positionClass} text-xs opacity-75 appointment-continuation`;
      content = '\u00A0';
    }
  } 
  // Availability slot styling and content
  else if (isAvailable && currentBlock) {
    const availabilityBaseClass = currentBlock.isException ? 'bg-teal-100 border-teal-500' : 'bg-green-100 border-green-500';
    className = `p-1 ${availabilityBaseClass} border-l-4 border-r border-l w-full h-full cursor-pointer hover:bg-opacity-80 transition-colors z-10 relative availability-block`;

    // Add border styling based on position
    if (isStartOfBlock) {
      className += ' border-t rounded-t';
    } else {
      className += ' border-t-0';
    }
    if (isEndOfBlock) {
      className += ' border-b rounded-b';
    } else {
      className += ' border-b-0';
    }

    onClick = handleAvailabilityClick;

    // Only show "Available" text at the start of a block
    if (isStartOfBlock) {
      content = (
        <div className="font-medium truncate flex items-center text-xs">
          Available
          {currentBlock.isException && (
            <span className="ml-1 text-[10px] px-1 py-0.5 bg-teal-200 text-teal-800 rounded-full">Modified</span>
          )}
        </div>
      );
    }
  } 
  // Empty slot styling
  else {
    className = 'h-full w-full z-0 relative empty-slot cursor-pointer';
  }

  // Add debug class for easier inspection
  const debugClass = appointment
    ? 'has-appointment'
    : (isAvailable && currentBlock)
    ? 'has-availability'
    : 'empty-slot';

  // Only allow drops on empty slots
  const shouldAcceptDrops = !appointment;

  // Render the time slot with error boundary
  return (
    <CalendarComponentErrorBoundary
      componentName={COMPONENT_NAME}
      contextData={{
        componentName: COMPONENT_NAME,
        day: formattedDay,
        time: formattedTime,
        hasAppointment: !!appointment,
        hasAvailability: isAvailable && !!currentBlock
      }}
      onError={(error) => setSlotError(error)}
    >
      <div
        className={`${className} ${debugClass}`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={shouldAcceptDrops ? handleDragOver : undefined}
        onDrop={shouldAcceptDrops ? handleDrop : undefined}
        title={title}
        data-testid={`timeslot-${formattedDay}-${formattedTime}`}
        data-slot-type={appointment ? 'appointment' : (isAvailable && currentBlock) ? 'availability' : 'empty'}
      >
        {content}
      </div>
    </CalendarComponentErrorBoundary>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if relevant props have changed
  
  // Always re-render if appointment data changes
  if (
    (prevProps.appointment?.id !== nextProps.appointment?.id) ||
    (prevProps.isStartOfAppointment !== nextProps.isStartOfAppointment) ||
    (prevProps.isEndOfAppointment !== nextProps.isEndOfAppointment)
  ) {
    return false; // Props are not equal, should re-render
  }
  
  // Always re-render if availability data changes
  if (
    (prevProps.isAvailable !== nextProps.isAvailable) ||
    (prevProps.isStartOfBlock !== nextProps.isStartOfBlock) ||
    (prevProps.isEndOfBlock !== nextProps.isEndOfBlock) ||
    (prevProps.currentBlock?.availabilityIds.join(',') !== nextProps.currentBlock?.availabilityIds.join(','))
  ) {
    return false; // Props are not equal, should re-render
  }
  
  // Check if day or time slot changed
  if (
    prevProps.day.getTime() !== nextProps.day.getTime() ||
    prevProps.timeSlot.getTime() !== nextProps.timeSlot.getTime()
  ) {
    return false; // Props are not equal, should re-render
  }
  
  // If we got here, props are considered equal for rendering purposes
  return true; // Props are equal, no need to re-render
});

export default TimeSlot;
