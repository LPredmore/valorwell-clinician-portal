import React from 'react';
import { TimeBlock, AppointmentBlock } from './types';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';

interface TimeSlotProps {
  day: Date;
  timeSlot: Date;
  isAvailable: boolean;
  currentBlock?: TimeBlock;
  appointment?: AppointmentBlock;
  isStartOfBlock: boolean;
  isEndOfBlock: boolean;
  isStartOfAppointment: boolean;
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
  handleAvailabilityBlockClick,
  onAppointmentClick,
  onAppointmentDragStart,
  onAppointmentDragOver,
  onAppointmentDrop,
  originalAppointments
}) => {
  // Debug logging for specific date/time we're looking for
  const specificDate = '2025-05-15';
  const formattedDay = new Date(day).toISOString().split('T')[0];
  const slotHour = timeSlot.getHours();
  const slotMinutes = timeSlot.getMinutes();
  const formattedTime = `${slotHour}:${slotMinutes.toString().padStart(2, '0')}`;
  const debugMode = formattedDay === specificDate && (slotHour >= 8 && slotHour <= 18);
  
  if (debugMode) {
    console.log('[TimeSlot] RENDER START:', {
      day: formattedDay,
      time: formattedTime,
      isAvailable,
      hasCurrentBlock: !!currentBlock,
      hasAppointment: !!appointment,
      props: {
        isStartOfBlock,
        isEndOfBlock,
        isStartOfAppointment
      }
    });
  }

  // Handle drag over event for empty time slots
  const handleDragOver = (e: React.DragEvent) => {
    if (onAppointmentDragOver) {
      e.preventDefault(); // Allow drop - CRITICAL for drag and drop to work
      onAppointmentDragOver(day, timeSlot, e);
      
      if (debugMode) {
        console.log('[TimeSlot] Drag over:', {
          day: new Date(day).toISOString().split('T')[0],
          time: `${timeSlot.getHours()}:${timeSlot.getMinutes().toString().padStart(2, '0')}`,
          type: appointment ? 'appointment' : (isAvailable && currentBlock) ? 'availability' : 'empty'
        });
      }
    }
  };
  
  // Handle drop event for empty time slots
  const handleDrop = (e: React.DragEvent) => {
    if (onAppointmentDrop) {
      e.preventDefault();
      onAppointmentDrop(day, timeSlot, e);
      
      if (debugMode) {
        console.log('[TimeSlot] Appointment dropped on:', {
          day: new Date(day).toISOString().split('T')[0],
          time: `${timeSlot.getHours()}:${timeSlot.getMinutes().toString().padStart(2, '0')}`,
          type: appointment ? 'appointment' : (isAvailable && currentBlock) ? 'availability' : 'empty'
        });
      }
    }
  };

  // APPOINTMENT RENDERING LOGIC
  let content = null;
  let className = "";
  let title = "";
  let onClick = undefined;
  let draggable = false;
  let onDragStart = undefined;

  // 1. APPOINTMENT RENDERING
  if (appointment) {
    if (debugMode) {
      console.log('[TimeSlot] RENDERING APPOINTMENT PATH');
    }
    
    // Handle appointment click event
    onClick = () => {
      if (onAppointmentClick && appointment) {
        // Find the original appointment in the originalAppointments array
        const originalAppointment = originalAppointments.find(a => a.id === appointment.id);
        
        if (originalAppointment) {
          // Call onAppointmentClick with the original appointment object
          onAppointmentClick(originalAppointment); // This is now typesafe with 'any'
          
          if (debugMode) {
            console.log('[TimeSlot] Appointment clicked:', {
              id: appointment.id,
              clientName: appointment.clientName,
              start: appointment.start.toFormat('HH:mm'),
              end: appointment.end.toFormat('HH:mm'),
              originalAppointment
            });
          }
        } else {
          // Fallback to using the appointment block if original not found
          onAppointmentClick(appointment);
          console.warn('[TimeSlot] Original appointment not found, using appointment block');
        }
      }
    };
    
    // Base appointment styling that's consistent for all cells
    const baseAppointmentClass = "p-1 bg-blue-100 border-l-4 border-blue-500 h-full w-full cursor-pointer transition-colors hover:bg-blue-200 z-20 relative bg-green-300/50";
    
    // Handle drag start event
    onDragStart = (e: React.DragEvent) => {
      if (onAppointmentDragStart && appointment) {
        // UPDATED: Less strict approach - use appointment from originalAppointments if found, otherwise use the provided appointment
        const appointmentToUse = originalAppointments.find(a => a.id === appointment.id) || appointment;
        
        // Set the appointment ID as the drag data
        e.dataTransfer.setData('application/json', JSON.stringify({
          appointmentId: appointmentToUse.id,
          clientName: appointmentToUse.clientName
        }));
        
        // Call the drag start handler
        if (onAppointmentDragStart) {
          onAppointmentDragStart(appointmentToUse, e);
        }
        
        console.log('[TimeSlot] Drag started:', appointmentToUse.id);
      }
    };
    
    // Position-specific styling
    let positionClass = "";
    
    if (isStartOfAppointment) {
      // Top of appointment
      positionClass = "rounded-t border-t border-r border-l";
      if (!isEndOfBlock) {
        positionClass += " border-b-0";
      }
    } else {
      // Middle sections - no top border
      positionClass = "border-r border-l border-t-0";
      if (!isEndOfBlock) {
        positionClass += " border-b-0";
      }
    }
    
    // Add bottom rounding if it's the end
    if (isEndOfBlock) {
      positionClass += " rounded-b border-b";
    }

    // Set title for tooltip
    title = `${appointment.clientName || 'Unknown Client'} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`;
    
    // Enable dragging
    draggable = true;

    // For the start of an appointment, show client name
    if (isStartOfAppointment) {
      if (debugMode) {
        console.log('[TimeSlot] RENDERING APPOINTMENT START with class:', ${baseAppointmentClass} ${positionClass});
      }
      
      className = ${baseAppointmentClass} ${positionClass} text-xs font-medium truncate appointment-start;
      content = appointment.clientName || 'Unknown Client';
    } else {
      // For continuation cells
      if (debugMode) {
        console.log('[TimeSlot] RENDERING APPOINTMENT CONTINUATION with class:', ${baseAppointmentClass} ${positionClass});
      }
      
      className = ${baseAppointmentClass} ${positionClass} text-xs opacity-75 appointment-continuation;
      content = '\u00A0'; // Non-breaking space
    }
  }
  // 2. AVAILABILITY BLOCK RENDERING
  else if (isAvailable && currentBlock && !appointment) {
    if (debugMode) {
      console.log('[TimeSlot] RENDERING AVAILABLE PATH - isAvailable && currentBlock are both true');
    }
    
    const availabilityBaseClass = currentBlock?.isException
      ? 'bg-teal-100 border-teal-500'
      : 'bg-green-100 border-green-500';
    
    // Complete class set for availability, with consistent borders
    className = p-1 ${availabilityBaseClass} border-l-4 border-r border-l w-full h-full cursor-pointer hover:bg-opacity-80 transition-colors z-10 relative availability-block bg-blue-300/50;
    
    // Apply top/bottom borders and rounding based on position
    if (isStartOfBlock) {
      className += " border-t rounded-t";
    } else {
      className += " border-t-0";
    }
    
    if (isEndOfBlock) {
      className += " border-b rounded-b";
    } else {
      className += " border-b-0";
    }
    
    // Debug for specific date we're looking for
    if (debugMode) {
      console.log('[TimeSlot] RENDERING AVAILABLE SLOT with class:', className);
    }
    
    // Set click handler
    onClick = () => currentBlock && handleAvailabilityBlockClick(day, currentBlock);
    
    // Set content
    if (isStartOfBlock) {
      content = (
        <div className="font-medium truncate flex items-center text-xs">
          Available
          {currentBlock?.isException && (
            <span className="ml-1 text-[10px] px-1 py-0.5 bg-teal-200 text-teal-800 rounded-full">Modified</span>
          )}
        </div>
      );
    }
  }
  // 3. EMPTY SLOT RENDERING
  else {
    // Debug log when we expected availability but it's not showing
    if (debugMode) {
      if (isAvailable && !currentBlock) {
        console.log('[TimeSlot] WARNING: isAvailable is TRUE but currentBlock is UNDEFINED');
      }
      
      console.log('[TimeSlot] RENDERING EMPTY SLOT - no appointment or availability', {
        isAvailableProp: isAvailable,
        hasCurrentBlock: !!currentBlock
      });
    }
    
    // Empty cell with no text, just drag handlers
    // Make sure it's fully interactive for drag and drop
    className = "h-full w-full z-0 relative empty-slot bg-red-300/50 cursor-pointer";
  }

  // Debug class for easier inspection
  const debugClass = appointment ? "has-appointment" :
                    (isAvailable && currentBlock) ? "has-availability" :
                    "empty-slot";

  // Determine if this slot should accept drops
  // We allow drops on empty slots and availability blocks, but not on existing appointments
  const shouldAcceptDrops = !appointment;
  
  // Single return statement with conditional rendering
  return (
    <div
      className={${className} ${debugClass}}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={shouldAcceptDrops ? handleDragOver : undefined}
      onDrop={shouldAcceptDrops ? handleDrop : undefined}
      title={title}
      data-testid={timeslot-${formattedDay}-${formattedTime}}
      data-slot-type={appointment ? 'appointment' : (isAvailable && currentBlock) ? 'availability' : 'empty'}
    >
      {content}
    </div>
  );
};

export default TimeSlot;
