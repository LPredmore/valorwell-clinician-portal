
import React, { useState } from 'react';
import { TimeBlock, AppointmentBlock } from './types';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import CalendarComponentErrorBoundary from './CalendarComponentErrorBoundary';
import CalendarErrorMessage from './CalendarErrorMessage';

interface TimeSlotProps {
  day: Date;
  timeSlot: Date;
  isAvailable: boolean;
  currentBlock?: TimeBlock;
  appointment?: AppointmentBlock;
  isStartOfBlock: boolean;
  isEndOfBlock: boolean;
  isStartOfAppointment: boolean;
  isEndOfAppointment?: boolean;
  handleAvailabilityBlockClick: (day: Date, block: TimeBlock) => void;
  onAppointmentClick?: (appointmentBlock: any) => void;
  onAppointmentDragStart?: (appointment: any, event: React.DragEvent) => void;
  onAppointmentDragOver?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  onAppointmentDrop?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  originalAppointments: Appointment[];
}

// Component name for logging
const COMPONENT_NAME = 'TimeSlot';

const TimeSlot: React.FC<TimeSlotProps> = ({
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
  const specificDate = '2025-05-15';
  const formattedDay = new Date(day).toISOString().split('T')[0];
  const slotHour = timeSlot.getHours();
  const slotMinutes = timeSlot.getMinutes();
  const formattedTime = `${slotHour}:${slotMinutes.toString().padStart(2, '0')}`;
  const debugMode = formattedDay === specificDate && (slotHour >= 8 && slotHour <= 18);

  const handleDragOver = (e: React.DragEvent) => {
    if (onAppointmentDragOver) {
      e.preventDefault();
      onAppointmentDragOver(day, timeSlot, e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (onAppointmentDrop) {
      e.preventDefault();
      onAppointmentDrop(day, timeSlot, e);
    }
  };

  let content = null;
  let className = '';
  let title = '';
  let onClick = undefined;
  let draggable = false;
  let onDragStart = undefined;

  if (appointment) {
    onClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Stop event propagation
      e.preventDefault(); // Prevent default behavior
      
      // Enhanced logging to debug appointment matching
      CalendarDebugUtils.log(COMPONENT_NAME, `Looking for appointment with ID: ${appointment.id}`, {
        appointmentId: appointment.id,
        originalAppointmentsCount: originalAppointments?.length || 0
      });
      
      try {
        // More robust lookup with additional logging
        const originalAppointment = originalAppointments?.find(a => a.id === appointment.id);
        
        if (originalAppointment) {
          CalendarDebugUtils.log(COMPONENT_NAME, 'Found original appointment', {
            id: originalAppointment.id,
            clientName: originalAppointment.clientName,
            clientId: originalAppointment.client_id,
            hasClient: !!originalAppointment.client,
            start_at: originalAppointment.start_at,
            end_at: originalAppointment.end_at
          });
          
          // Ensure we have a valid callback before calling it
          if (onAppointmentClick) {
            onAppointmentClick(originalAppointment);
          } else {
            throw new Error('onAppointmentClick callback is not defined');
          }
        } else {
          CalendarDebugUtils.warn(COMPONENT_NAME, `Original appointment not found for ID: ${appointment.id}`, {
            appointmentId: appointment.id,
            availableAppointmentsCount: originalAppointments?.length || 0
          });
          
          // Convert the AppointmentBlock to a full Appointment object
          const fullAppointment = convertAppointmentBlockToAppointment(appointment, originalAppointments || []);
          CalendarDebugUtils.log(COMPONENT_NAME, 'Using converted appointment', {
            id: fullAppointment.id,
            clientName: fullAppointment.clientName,
            clientId: fullAppointment.client_id,
            hasClient: !!fullAppointment.client,
            start_at: fullAppointment.start_at,
            end_at: fullAppointment.end_at
          });
          
          // Ensure we have a valid callback before calling it
          if (onAppointmentClick) {
            onAppointmentClick(fullAppointment);
          } else {
            throw new Error('onAppointmentClick callback is not defined');
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error handling appointment click', err);
        setSlotError(err);
      }
    };

    const baseAppointmentClass = 'p-1 bg-blue-100 border-l-4 border-blue-500 h-full w-full cursor-pointer transition-colors hover:bg-blue-200 z-20 relative';

    onDragStart = (e: React.DragEvent) => {
      try {
        const original = originalAppointments.find(a => a.id === appointment.id) || appointment;
        e.dataTransfer.setData('application/json', JSON.stringify({
          appointmentId: original.id,
          clientName: original.clientName
        }));
        
        if (onAppointmentDragStart) {
          onAppointmentDragStart(original, e);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error starting drag operation', err);
        setSlotError(err);
      }
    };

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

    title = `${appointment.clientName || 'Unknown Client'} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`;
    draggable = true;

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
  } else if (isAvailable && currentBlock && !appointment) {
    const availabilityBaseClass = currentBlock.isException ? 'bg-teal-100 border-teal-500' : 'bg-green-100 border-green-500';
    className = `p-1 ${availabilityBaseClass} border-l-4 border-r border-l w-full h-full cursor-pointer hover:bg-opacity-80 transition-colors z-10 relative availability-block`;

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

    onClick = () => {
      try {
        if (currentBlock && handleAvailabilityBlockClick) {
          handleAvailabilityBlockClick(day, currentBlock);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error handling availability click', err);
        setSlotError(err);
      }
    };

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
  } else {
    className = 'h-full w-full z-0 relative empty-slot cursor-pointer';
  }

  const debugClass = appointment
    ? 'has-appointment'
    : (isAvailable && currentBlock)
    ? 'has-availability'
    : 'empty-slot';

  const shouldAcceptDrops = !appointment;

  // Handle error reset
  const handleErrorReset = () => {
    setSlotError(null);
  };

  // If there's an error, show the error message
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
          day: formattedDay,
          time: formattedTime,
          hasAppointment: !!appointment,
          hasAvailability: isAvailable && !!currentBlock
        }}
      />
    );
  }

  // Wrap the time slot in an error boundary
  return (
    <CalendarComponentErrorBoundary
      componentName={COMPONENT_NAME}
      contextData={{
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
};

export default TimeSlot;
