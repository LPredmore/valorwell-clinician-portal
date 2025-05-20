import React from 'react';
import { TimeBlock, AppointmentBlock } from './week-view/types';
import { Appointment } from '@/types/appointment';

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
  onAppointmentClick?: (appointmentBlock: Appointment) => void;
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
  originalAppointments,
}) => {
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
  let onClick: (() => void) | undefined = undefined;
  let draggable = false;
  let onDragStart: ((e: React.DragEvent) => void) | undefined = undefined;

  if (appointment) {
    onClick = () => {
      if (!onAppointmentClick) return;

      const originalAppointment = originalAppointments.find(
        (a) => a.id === appointment.id
      );

      if (originalAppointment) {
        onAppointmentClick(originalAppointment);
      } else {
        console.error('[TimeSlot] Could not find original appointment for ID:', appointment.id);
      }
    };

    className = 'bg-blue-200 border border-blue-400 text-sm p-1';
    title = `${appointment.clientName || 'Unknown Client'} - ${appointment.start.toFormat('h:mm a')} to ${appointment.end.toFormat('h:mm a')}`;
    content = appointment.clientName || 'Unknown Client';
    draggable = true;
    onDragStart = (e: React.DragEvent) => {
      const appointmentToUse = originalAppointments.find(a => a.id === appointment.id) || appointment;
      e.dataTransfer.setData('application/json', JSON.stringify({
        appointmentId: appointmentToUse.id,
        clientName: appointmentToUse.clientName
      }));
      if (onAppointmentDragStart) onAppointmentDragStart(appointmentToUse, e);
    };
  } else if (isAvailable && currentBlock) {
    onClick = () => handleAvailabilityBlockClick(day, currentBlock);
    className = 'bg-green-100 border border-green-400 text-xs p-1';
    content = isStartOfBlock ? 'Available' : '\u00A0';
  } else {
    className = 'bg-red-100';
  }

  const shouldAcceptDrops = !appointment;

  return (
    <div
      className={className}
      title={title}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={shouldAcceptDrops ? handleDragOver : undefined}
      onDrop={shouldAcceptDrops ? handleDrop : undefined}
    >
      {content}
    </div>
  );
};

export default TimeSlot;
