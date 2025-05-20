import React from 'react';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { TimeBlock, AppointmentBlock } from './types';

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
  const formattedDay = new Date(day).toISOString().split('T')[0];
  const slotHour = timeSlot.getHours();
  const slotMinutes = timeSlot.getMinutes();
  const formattedTime = `${slotHour}:${slotMinutes.toString().padStart(2, '0')}`;

  const handleDragOver = (e: React.DragEvent) => {
    if (!appointment && onAppointmentDragOver) {
      e.preventDefault();
      onAppointmentDragOver(day, timeSlot, e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!appointment && onAppointmentDrop) {
      e.preventDefault();
      onAppointmentDrop(day, timeSlot, e);
    }
  };

  const onClick = appointment
    ? () => {
        const original = originalAppointments.find(a => a.id === appointment.id);
        onAppointmentClick?.(original || appointment);
      }
    : currentBlock
    ? () => handleAvailabilityBlockClick(day, currentBlock)
    : undefined;

  let content: React.ReactNode = null;
  let className = 'h-full w-full relative';
  let title = '';
  let draggable = false;
  let onDragStart: undefined | ((e: React.DragEvent) => void) = undefined;

  if (appointment) {
    draggable = true;
    const isStart = isStartOfAppointment;
    const app = originalAppointments.find(a => a.id === appointment.id) || appointment;
    title = `${app.clientName} - ${app.start.toFormat('h:mm a')} to ${app.end.toFormat('h:mm a')}`;
    onDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('application/json', JSON.stringify({ appointmentId: app.id }));
      onAppointmentDragStart?.(app, e);
    };

    className += ` bg-green-300/50 border-l-4 border-green-600 p-1 ${
      isStart ? 'rounded-t text-xs font-medium truncate' : 'text-xs opacity-75'
    }`;
    if (isStart) {
      content = app.clientName;
    } else {
      content = '\u00A0';
    }
  } else if (isAvailable && currentBlock) {
    className += ' bg-blue-300/50 border-l-4 border-blue-600 p-1 text-xs cursor-pointer';
    content = isStartOfBlock ? 'Available' : '\u00A0';
  }

  return (
    <div
      className={className}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title={title}
      data-testid={`timeslot-${formattedDay}-${formattedTime}`}
    >
      {content}
    </div>
  );
};

export default TimeSlot;
