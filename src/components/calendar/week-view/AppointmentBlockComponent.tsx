import React, { memo, useCallback } from 'react';
import { AppointmentBlock } from './types';
import { Appointment } from '@/types/appointment';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';

// Component name for logging
const COMPONENT_NAME = 'AppointmentBlockComponent';

interface AppointmentBlockProps {
  appointment: AppointmentBlock;
  isStartOfAppointment: boolean;
  isEndOfAppointment: boolean;
  originalAppointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onAppointmentDragStart?: (appointment: Appointment, event: React.DragEvent) => void;
}

/**
 * AppointmentBlockComponent - Renders an appointment block in the calendar
 * Extracted from TimeSlot for better separation of concerns
 */
const AppointmentBlockComponent: React.FC<AppointmentBlockProps> = memo(({
  appointment,
  isStartOfAppointment,
  isEndOfAppointment,
  originalAppointments,
  onAppointmentClick,
  onAppointmentDragStart
}) => {
  // Base class for appointments
  const baseAppointmentClass = 'p-1 bg-blue-100 border-l-4 border-blue-500 h-full w-full cursor-pointer transition-colors hover:bg-blue-200 z-20 relative';
  
  // Determine position-specific classes
  let positionClass = '';
  const isMiddleOfAppointment = !isStartOfAppointment && !isEndOfAppointment;
  
  if (isStartOfAppointment) {
    positionClass = 'rounded-t border-t border-r border-l';
    if (!isEndOfAppointment) positionClass += ' border-b-0';
  } else if (isMiddleOfAppointment) {
    positionClass = 'border-r border-l border-t-0 border-b-0';
  } else if (isEndOfAppointment) {
    positionClass = 'rounded-b border-r border-l border-b border-t-0';
  }

  // Handle appointment click
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onAppointmentClick) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    try {
      // Log for debugging
      CalendarDebugUtils.log(COMPONENT_NAME, `Appointment clicked: ${appointment.id}`, {
        appointmentId: appointment.id,
        clientName: appointment.clientName
      });
      
      // Find the original appointment with complete data
      const originalAppointment = originalAppointments?.find(a => a.id === appointment.id);
      
      if (originalAppointment) {
        onAppointmentClick(originalAppointment);
      } else {
        // Convert the AppointmentBlock to a full Appointment object if original not found
        const fullAppointment = convertAppointmentBlockToAppointment(appointment, originalAppointments || []);
        onAppointmentClick(fullAppointment);
      }
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error handling appointment click', error);
    }
  }, [appointment, originalAppointments, onAppointmentClick]);

  // Handle appointment drag start
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!onAppointmentDragStart) return;
    
    try {
      // Find the original appointment or convert the block to a full appointment
      const original = originalAppointments.find(a => a.id === appointment.id);
      
      if (original) {
        e.dataTransfer.setData('application/json', JSON.stringify({
          appointmentId: original.id,
          clientName: original.clientName
        }));
        
        onAppointmentDragStart(original, e);
      } else {
        // Convert to full appointment if original not found
        const fullAppointment = convertAppointmentBlockToAppointment(appointment, originalAppointments);
        
        e.dataTransfer.setData('application/json', JSON.stringify({
          appointmentId: fullAppointment.id,
          clientName: fullAppointment.clientName
        }));
        
        onAppointmentDragStart(fullAppointment, e);
      }
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error starting drag operation', error);
    }
  }, [appointment, originalAppointments, onAppointmentDragStart]);

  // Set content based on position in appointment
  let content = null;
  let className = '';
  
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

  // Title for tooltip
  const title = `${appointment.clientName || 'Unknown Client'} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`;

  return (
    <div
      className={className}
      onClick={handleClick}
      draggable={true}
      onDragStart={handleDragStart}
      title={title}
      data-appointment-id={appointment.id}
      data-client-id={appointment.clientId}
    >
      {content}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if relevant props have changed
  if (
    prevProps.appointment.id !== nextProps.appointment.id ||
    prevProps.isStartOfAppointment !== nextProps.isStartOfAppointment ||
    prevProps.isEndOfAppointment !== nextProps.isEndOfAppointment
  ) {
    return false; // Props are not equal, should re-render
  }
  
  return true; // Props are equal, no need to re-render
});

export default AppointmentBlockComponent;