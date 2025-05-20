import React, { useState } from 'react';
import { format } from 'date-fns';
import { useWeekViewData } from './useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './TimeSlot';
import { AvailabilityBlock } from '@/types/availability';
import { Appointment } from '@/types/appointment';

interface WeekViewProps {
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
  showAvailability?: boolean;
  refreshTrigger?: number;
  appointments?: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onAvailabilityClick?: (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => void;
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  currentDate?: Date;
}

const START_HOUR = 7;
const END_HOUR = 19;
const INTERVAL_MINUTES = 30;
const TIME_SLOTS: Date[] = [];
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0);

for (let hour = START_HOUR; hour < END_HOUR; hour++) {
  for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
    const timeSlot = new Date(baseDate);
    timeSlot.setHours(hour, minute, 0, 0);
    TIME_SLOTS.push(timeSlot);
  }
}

const WeekView: React.FC<WeekViewProps> = ({
  days,
  selectedClinicianId,
  userTimeZone,
  showAvailability = true,
  refreshTrigger = 0,
  appointments = [],
  onAppointmentClick,
  onAvailabilityClick,
  onAppointmentUpdate,
}) => {
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);

  const {
    loading,
    weekDays,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  } = useWeekViewData(
    days,
    selectedClinicianId,
    refreshTrigger,
    appointments,
    (id: string) => `Client ${id}`,
    userTimeZone
  );

  const handleAvailabilityBlockClick = (day: Date, block: any) => {
    if (!onAvailabilityClick) return;
    const availabilityBlock: AvailabilityBlock = {
      id: block.availabilityIds[0] || 'unknown',
      clinician_id: selectedClinicianId || '',
      start_at: block.start.toUTC().toISO(),
      end_at: block.end.toUTC().toISO(),
      is_active: true
    };
    onAvailabilityClick(day, availabilityBlock);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    if (onAppointmentClick) onAppointmentClick(appointment);
  };

  const handleAppointmentDragStart = (appointment: Appointment) => {
    setDraggedAppointmentId(appointment.id);
  };

  const handleAppointmentDrop = (day: Date, timeSlot: Date, event: React.DragEvent) => {
    if (!draggedAppointmentId || !onAppointmentUpdate) return;
    try {
      const dragData = JSON.parse(event.dataTransfer.getData('application/json'));
      const appointment = appointments.find(a => a.id === dragData.appointmentId);
      if (!appointment) return;

      const duration = DateTime.fromISO(appointment.end_at).diff(DateTime.fromISO(appointment.start_at)).as('minutes');
      const newStart = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
      const newEnd = newStart.plus({ minutes: duration });
      onAppointmentUpdate(appointment.id, newStart.toUTC().toISO(), newEnd.toUTC().toISO());
    } catch (e) {
      console.error('Error during appointment drop:', e);
    }
    setDraggedAppointmentId(null);
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="flex flex-col">
      <div className="flex">
        <div className="w-16"></div>
        {weekDays.map(day => (
          <div key={day.toISO()} className="w-24 flex-1 px-2 py-1 text-center border-r">
            <div>{day.toFormat('EEE')}</div>
            <div className="text-sm text-gray-500">{day.toFormat('MMM d')}</div>
          </div>
        ))}
      </div>
      <div className="flex">
        <div className="w-16">
          {TIME_SLOTS.map((t, i) => (
            <div key={i} className="h-10 text-xs text-right pr-2 text-gray-400 flex items-center justify-end">
              {format(t, 'h:mm a')}
            </div>
          ))}
        </div>
        {weekDays.map(day => (
          <div key={day.toISO()} className="flex-1 border-r">
            {TIME_SLOTS.map((slot, i) => {
              const dayDt = TimeZoneService.fromJSDate(day.toJSDate(), userTimeZone);
              const slotDt = TimeZoneService.fromJSDate(slot, userTimeZone);
              const isAvailable = showAvailability && isTimeSlotAvailable(dayDt.toJSDate(), slotDt.toJSDate());
              const currentBlock = isAvailable ? getBlockForTimeSlot(dayDt.toJSDate(), slotDt.toJSDate()) : undefined;
              const appointment = getAppointmentForTimeSlot(dayDt.toJSDate(), slotDt.toJSDate());
              const isStartOfBlock = currentBlock && slotDt.toFormat('HH:mm') === currentBlock.start.toFormat('HH:mm');
              const isEndOfBlock = currentBlock && slotDt.plus({ minutes: 30 }).toFormat('HH:mm') === currentBlock.end.toFormat('HH:mm');
              const isStartOfAppointment = appointment && slotDt.toFormat('HH:mm') === appointment.start.toFormat('HH:mm');

              return (
                <div key={i} className="h-10 border-b border-l">
                  <TimeSlot
                    day={dayDt.toJSDate()}
                    timeSlot={slot}
                    isAvailable={isAvailable}
                    currentBlock={currentBlock}
                    appointment={appointment}
                    isStartOfBlock={isStartOfBlock}
                    isEndOfBlock={isEndOfBlock}
                    isStartOfAppointment={isStartOfAppointment}
                    handleAvailabilityBlockClick={handleAvailabilityBlockClick}
                    onAppointmentClick={handleAppointmentClick}
                    onAppointmentDragStart={handleAppointmentDragStart}
                    onAppointmentDrop={handleAppointmentDrop}
                    originalAppointments={appointments}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekView;
