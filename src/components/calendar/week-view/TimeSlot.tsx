import React from 'react';
import { TimeBlock, AppointmentBlock } from './types';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import { TimeZoneService } from '@/utils/timeZoneService';
import { isBlockedTimeAppointment, getBlockedTimeDisplayName } from '@/utils/blockedTimeUtils';

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
  // Convert Date objects to DateTime internally when needed for formatting
  const dayDt = TimeZoneService.fromJSDate(day, 'UTC');
  const timeSlotDt = TimeZoneService.fromJSDate(timeSlot, 'UTC');
  
  const formattedDay = dayDt.toFormat('yyyy-MM-dd');
  const formattedTime = timeSlotDt.toFormat('HH:mm');

  // DEBUGGING: Log what this TimeSlot is rendering
  const debugTimeSlot = timeSlotDt.hour >= 8 && timeSlotDt.hour <= 18;
  if (debugTimeSlot) {
    console.log(`[TimeSlot] RENDERING ${formattedDay} ${formattedTime}:`, {
      hasAppointment: !!appointment,
      appointmentDetails: appointment ? {
        id: appointment.id,
        clientName: appointment.clientName,
        startTime: appointment.start.toFormat('HH:mm'),
        endTime: appointment.end.toFormat('HH:mm')
      } : null,
      isStartOfAppointment,
      isEndOfAppointment,
      isAvailable,
      hasCurrentBlock: !!currentBlock,
      isStartOfBlock,
      isEndOfBlock
    });
  }

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
    // Check if this is a blocked time appointment
    const isBlockedTime = isBlockedTimeAppointment(appointment);
    
    onClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      console.log(`[TimeSlot] Appointment clicked - Looking for appointment with ID: ${appointment.id}`);
      
      try {
        const originalAppointment = originalAppointments?.find(a => a.id === appointment.id);
        
        if (originalAppointment) {
          console.log(`[TimeSlot] Found original appointment:`, {
            id: originalAppointment.id,
            clientName: originalAppointment.clientName,
            clientId: originalAppointment.client_id,
            status: originalAppointment.status,
            isBlockedTime: isBlockedTimeAppointment(originalAppointment)
          });
          
          if (onAppointmentClick) {
            onAppointmentClick(originalAppointment);
          }
        } else {
          console.warn(`[TimeSlot] Original appointment not found for ID: ${appointment.id}. Converting AppointmentBlock to full Appointment.`);
          const fullAppointment = convertAppointmentBlockToAppointment(appointment, originalAppointments || []);
          
          if (onAppointmentClick) {
            onAppointmentClick(fullAppointment);
          }
        }
      } catch (error) {
        console.error('[TimeSlot] Error handling appointment click:', error);
      }
    };

    // Different styling for blocked time vs regular appointments
    const baseAppointmentClass = isBlockedTime 
      ? 'p-1 bg-red-100 border-l-4 border-red-500 h-full w-full cursor-pointer transition-colors hover:bg-red-200 z-20 relative'
      : 'p-1 bg-blue-100 border-l-4 border-blue-500 h-full w-full cursor-pointer transition-colors hover:bg-blue-200 z-20 relative';

    onDragStart = (e: React.DragEvent) => {
      const original = originalAppointments.find(a => a.id === appointment.id) || appointment;
      e.dataTransfer.setData('application/json', JSON.stringify({
        appointmentId: original.id,
        clientName: original.clientName
      }));
      onAppointmentDragStart?.(original, e);
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

    title = isBlockedTime 
      ? `${getBlockedTimeDisplayName(appointment)} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`
      : `${appointment.clientName || 'Unknown Client'} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`;
    
    // Blocked time appointments should not be draggable
    draggable = !isBlockedTime;

    if (isStartOfAppointment) {
      className = `${baseAppointmentClass} ${positionClass} text-xs font-medium truncate appointment-start`;
      content = isBlockedTime 
        ? getBlockedTimeDisplayName(appointment)
        : (appointment.clientName || 'Unknown Client');
      
      // DEBUGGING: Log when we're showing appointment content
      if (debugTimeSlot) {
        console.log(`[TimeSlot] SHOWING APPOINTMENT CONTENT:`, {
          content: content,
          className: className,
          appointmentId: appointment.id
        });
      }
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

    onClick = () => currentBlock && handleAvailabilityBlockClick(day, currentBlock);

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
    
    // DEBUGGING: Log empty slots during debug hours
    if (debugTimeSlot) {
      console.log(`[TimeSlot] EMPTY SLOT at ${formattedDay} ${formattedTime}:`, {
        isAvailable,
        hasCurrentBlock: !!currentBlock,
        hasAppointment: !!appointment
      });
    }
  }

  const debugClass = appointment
    ? 'has-appointment'
    : (isAvailable && currentBlock)
    ? 'has-availability'
    : 'empty-slot';

  const shouldAcceptDrops = !appointment;

  // DEBUGGING: Final render decision
  if (debugTimeSlot) {
    console.log(`[TimeSlot] FINAL RENDER DECISION for ${formattedDay} ${formattedTime}:`, {
      renderType: appointment ? 'appointment' : (isAvailable && currentBlock) ? 'availability' : 'empty',
      className,
      content: typeof content === 'string' ? content : 'React element',
      hasOnClick: !!onClick
    });
  }

  return (
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
  );
};

export default TimeSlot;
