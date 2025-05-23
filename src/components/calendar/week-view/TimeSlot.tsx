
import React from 'react';
import { TimeSlotProps } from './types';
import { isStartOfBlock, isEndOfBlock, isStartOfAppointment, isWithinAppointment } from './utils';

const TimeSlot: React.FC<TimeSlotProps> = ({
  day,
  timeSlot,
  isAvailable,
  currentBlock,
  appointment,
  isStartOfBlock: propIsStartOfBlock,
  isEndOfBlock: propIsEndOfBlock,
  isStartOfAppointment: propIsStartOfAppointment,
  handleAvailabilityBlockClick,
  onAppointmentClick,
  onAppointmentDragStart,
  onAppointmentDragOver,
  onAppointmentDrop,
  originalAppointments
}) => {
  // Use the props for determining block boundaries
  const isBlockStart = propIsStartOfBlock;
  const isBlockEnd = propIsEndOfBlock;
  const isAppointmentStart = propIsStartOfAppointment;
  const isWithinAppointmentSlot = appointment && isWithinAppointment(timeSlot, appointment);

  // Handle click events
  const handleClick = () => {
    if (appointment && onAppointmentClick) {
      console.log('[TimeSlot] Appointment clicked:', {
        id: appointment.id,
        clientName: appointment.clientName,
        start: appointment.start?.toISO?.() || appointment.start,
        end: appointment.end?.toISO?.() || appointment.end
      });
      onAppointmentClick(appointment);
    } else if (currentBlock && isAvailable) {
      handleAvailabilityBlockClick(day, currentBlock);
    }
  };

  // Handle drag events
  const handleDragStart = (e: React.DragEvent) => {
    if (appointment && onAppointmentDragStart) {
      onAppointmentDragStart(appointment, e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (onAppointmentDragOver) {
      onAppointmentDragOver(day, timeSlot, e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (onAppointmentDrop) {
      onAppointmentDrop(day, timeSlot, e);
    }
  };

  // Render appointment content with proper client name display
  const renderAppointmentContent = () => {
    if (!appointment) return null;

    // Get client name from multiple possible sources
    const clientName = appointment.clientName || 
                      appointment.client_name || 
                      (appointment.client?.client_preferred_name) ||
                      (appointment.client?.client_first_name && appointment.client?.client_last_name 
                        ? `${appointment.client.client_first_name} ${appointment.client.client_last_name}`
                        : null) ||
                      'Unknown Client';

    console.log('[TimeSlot] Rendering appointment content:', {
      appointmentId: appointment.id,
      clientName,
      isStart: isAppointmentStart,
      appointmentData: appointment
    });

    return (
      <div
        className={`
          appointment-slot h-full w-full relative cursor-pointer
          ${isAppointmentStart 
            ? 'bg-blue-500 text-white font-medium rounded-t border-2 border-blue-600' 
            : 'bg-blue-400 text-white border-x-2 border-blue-600'
          }
          hover:bg-blue-600 transition-colors
        `}
        onClick={handleClick}
        draggable={isAppointmentStart}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        title={`${clientName} - ${appointment.type || 'Session'}`}
      >
        {isAppointmentStart && (
          <div className="px-1 py-0.5 text-xs leading-tight overflow-hidden">
            <div className="font-semibold truncate">{clientName}</div>
            <div className="opacity-90 truncate">{appointment.type || 'Session'}</div>
          </div>
        )}
      </div>
    );
  };

  // Render availability content
  const renderAvailabilityContent = () => {
    if (!isAvailable || !currentBlock) return null;

    return (
      <div
        className={`
          availability-slot h-full w-full cursor-pointer
          ${isBlockStart 
            ? 'bg-green-100 border-t-2 border-green-300 rounded-t' 
            : isBlockEnd 
            ? 'bg-green-50 border-b-2 border-green-300 rounded-b' 
            : 'bg-green-50 border-l-2 border-r-2 border-green-300'
          }
          hover:bg-green-200 transition-colors
        `}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        title="Available time slot"
      >
        {isBlockStart && (
          <div className="px-1 py-0.5 text-xs text-green-700">
            Available
          </div>
        )}
      </div>
    );
  };

  // Main render logic
  if (appointment) {
    return renderAppointmentContent();
  } else if (isAvailable) {
    return renderAvailabilityContent();
  } else {
    // Empty time slot
    return (
      <div
        className="h-full w-full cursor-default"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    );
  }
};

export default TimeSlot;
