
import React from 'react';
import { TimeSlotProps } from './types';

const TimeSlot: React.FC<TimeSlotProps> = ({
  day,
  timeSlot,
  isAvailable,
  currentBlock,
  appointment,
  isStartOfBlock,
  isEndOfBlock,
  isStartOfAppointment,
  isEndOfAppointment,
  handleAvailabilityBlockClick,
  onAppointmentClick,
  onAppointmentDragStart,
  onAppointmentDragOver,
  onAppointmentDrop,
  originalAppointments
}) => {
  // Handle drag events
  const handleDragOver = (event: React.DragEvent) => {
    if (onAppointmentDragOver) {
      onAppointmentDragOver(day, timeSlot, event);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    if (onAppointmentDrop) {
      onAppointmentDrop(day, timeSlot, event);
    }
  };

  const handleAppointmentDragStart = (event: React.DragEvent) => {
    if (appointment && onAppointmentDragStart) {
      onAppointmentDragStart(appointment, event);
    }
  };

  // Render availability block
  if (isAvailable && currentBlock && isStartOfBlock && !appointment) {
    return (
      <div
        className="h-full bg-green-100 border border-green-300 cursor-pointer hover:bg-green-200 transition-colors duration-150 flex items-center justify-center text-xs text-green-700"
        onClick={() => handleAvailabilityBlockClick(day, currentBlock)}
      >
        Available
      </div>
    );
  }

  // Render appointment block
  if (appointment && isStartOfAppointment) {
    // Find the original appointment data for more complete information
    const originalAppointment = originalAppointments?.find(a => a.id === appointment.id);
    
    return (
      <div
        className="h-full bg-blue-100 border border-blue-300 cursor-pointer hover:bg-blue-200 transition-colors duration-150 p-1 text-xs overflow-hidden"
        draggable
        onDragStart={handleAppointmentDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (onAppointmentClick) {
            // Use original appointment data if available, otherwise use appointment block
            const appointmentToPass = originalAppointment || appointment;
            onAppointmentClick(appointmentToPass);
          }
        }}
      >
        <div className="font-medium text-blue-800 truncate">
          {appointment.clientName || 'Unknown Client'}
        </div>
        <div className="text-blue-600 truncate">
          {appointment.type || 'Appointment'}
        </div>
      </div>
    );
  }

  // Render empty slot
  return (
    <div
      className="h-full hover:bg-gray-100 transition-colors duration-150"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
};

export default TimeSlot;
