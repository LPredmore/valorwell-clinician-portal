
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
  onAppointmentClick?: (appointmentBlock: AppointmentBlock) => void;
  onAppointmentDragStart?: (appointment: Appointment, event: React.DragEvent) => void;
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

  // For appointments, handle styling to ensure visual continuity
  if (appointment) {
    if (debugMode) {
      console.log('[TimeSlot] RENDERING APPOINTMENT PATH');
    }
    
    // Handle appointment click event
    const handleAppointmentClick = () => {
      if (onAppointmentClick && appointment) {
        // Find the original appointment in the originalAppointments array
        const originalAppointment = originalAppointments.find(a => a.id === appointment.id);
        
        if (originalAppointment) {
          // Call onAppointmentClick with the original appointment object
          onAppointmentClick(originalAppointment);
          
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
    const baseAppointmentClass = "p-1 bg-blue-100 border-l-4 border-blue-500 h-full w-full cursor-pointer transition-colors hover:bg-blue-200 z-20 relative";
    
    // Handle drag start event
    const handleDragStart = (e: React.DragEvent) => {
      if (onAppointmentDragStart && appointment) {
        // Find the original appointment in the originalAppointments array
        const originalAppointment = originalAppointments.find(a => a.id === appointment.id);
        
        if (originalAppointment) {
          // Set the appointment ID as the drag data
          e.dataTransfer.setData('application/json', JSON.stringify({
            appointmentId: originalAppointment.id,
            clientName: originalAppointment.clientName
          }));
          
          // Call the drag start handler
          onAppointmentDragStart(originalAppointment, e);
          
          if (debugMode) {
            console.log('[TimeSlot] Appointment drag started:', {
              id: appointment.id,
              clientName: appointment.clientName
            });
          }
        }
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

    // For the start of an appointment, show client name
    if (isStartOfAppointment) {
      if (debugMode) {
        console.log('[TimeSlot] RENDERING APPOINTMENT START with class:', `${baseAppointmentClass} ${positionClass}`);
      }
      
      return (
        <div
          className={`${baseAppointmentClass} ${positionClass} text-xs font-medium truncate`}
          onClick={handleAppointmentClick}
          draggable={true}
          onDragStart={handleDragStart}
          title={`${appointment.clientName || 'Unknown Client'} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`}
        >
          {appointment.clientName || 'Unknown Client'}
        </div>
      );
    } 
    
    // For continuation cells
    if (debugMode) {
      console.log('[TimeSlot] RENDERING APPOINTMENT CONTINUATION with class:', `${baseAppointmentClass} ${positionClass}`);
    }
    
    return (
      <div
        className={`${baseAppointmentClass} ${positionClass} text-xs opacity-75`}
        onClick={handleAppointmentClick}
        draggable={true}
        onDragStart={handleDragStart}
        title={`${appointment.clientName || 'Unknown Client'} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`}
      >
        &nbsp;
      </div>
    );
  } 
  
  // For availability blocks, ensure visual continuity
  if (isAvailable && currentBlock && !appointment) {
    if (debugMode) {
      console.log('[TimeSlot] RENDERING AVAILABLE PATH - isAvailable && currentBlock are both true');
    }
    
    const availabilityBaseClass = currentBlock?.isException
      ? 'bg-teal-100 border-teal-500'
      : 'bg-green-100 border-green-500';
    
    // Complete class set for availability, with consistent borders
    let availabilityClass = `p-1 ${availabilityBaseClass} border-l-4 border-r border-l w-full h-full cursor-pointer hover:bg-opacity-80 transition-colors z-10 relative`;
    
    // Apply top/bottom borders and rounding based on position
    if (isStartOfBlock) {
      availabilityClass += " border-t rounded-t";
    } else {
      availabilityClass += " border-t-0";
    }
    
    if (isEndOfBlock) {
      availabilityClass += " border-b rounded-b";
    } else {
      availabilityClass += " border-b-0";
    }
    
    // Debug for specific date we're looking for
    if (debugMode) {
      console.log('[TimeSlot] RENDERING AVAILABLE SLOT with class:', availabilityClass);
    }
    
    return (
      <div
        className={availabilityClass}
        onClick={() => currentBlock && handleAvailabilityBlockClick(day, currentBlock)}
      >
        {isStartOfBlock && (
          <div className="font-medium truncate flex items-center text-xs">
            Available
            {currentBlock?.isException && (
              <span className="ml-1 text-[10px] px-1 py-0.5 bg-teal-200 text-teal-800 rounded-full">Modified</span>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Debug log when we expected availability but it's not showing
  if (debugMode) {
    if (isAvailable && !currentBlock) {
      console.log('[TimeSlot] WARNING: isAvailable is TRUE but currentBlock is UNDEFINED');
    }
    
    console.log('[TimeSlot] RENDERING UNAVAILABLE PATH - final fallback', {
      isAvailableProp: isAvailable,
      hasCurrentBlock: !!currentBlock
    });
  }
  
  // Handle drag over event for empty time slots
  const handleDragOver = (e: React.DragEvent) => {
    if (onAppointmentDragOver) {
      e.preventDefault(); // Allow drop
      onAppointmentDragOver(day, timeSlot, e);
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
          time: `${timeSlot.getHours()}:${timeSlot.getMinutes().toString().padStart(2, '0')}`
        });
      }
    }
  };
  
  // Default empty cell with faded "Unavailable" text on hover
  return (
    <div
      className="h-full w-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-gray-400 z-0 relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      Unavailable
    </div>
  );
};

export default TimeSlot;
