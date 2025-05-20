// WeekView.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useWeekViewData } from './useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './TimeSlot';
import { AvailabilityBlock } from '@/types/availability';
import { Appointment } from '@/types/appointment';
import EditAppointmentDialog from './EditAppointmentDialog';

interface WeekViewProps {
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
  showAvailability?: boolean;
  refreshTrigger?: number;
  appointments?: Appointment[];
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  onAppointmentDelete?: (appointmentId: string) => void;
}

const START_HOUR = 7;
const END_HOUR = 19;
const INTERVAL_MINUTES = 30;
const TIME_SLOTS: Date[] = [];
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0);
for (let hour = START_HOUR; hour < END_HOUR; hour++) {
  for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
    const slot = new Date(baseDate);
    slot.setHours(hour, minute, 0, 0);
    TIME_SLOTS.push(slot);
  }
}

const WeekView: React.FC<WeekViewProps> = ({
  days,
  selectedClinicianId,
  userTimeZone,
  showAvailability = true,
  refreshTrigger = 0,
  appointments = [],
  onAppointmentUpdate,
  onAppointmentDelete,
}) => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const {
    loading,
    weekDays,
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

  const handleAppointmentClick = (appt: Appointment) => setSelectedAppointment(appt);

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="flex flex-col">
      {selectedAppointment && (
        <EditAppointmentDialog
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={(updated) => {
            onAppointmentUpdate?.(updated.id, updated.start_at, updated.end_at);
            setSelectedAppointment(null);
          }}
          onDelete={(id) => {
            onAppointmentDelete?.(id);
            setSelectedAppointment(null);
          }}
        />
      )}

      <div className="flex">
        <div className="w-16" />
        {weekDays.map(day => (
          <div key={day.toISO()} className="w-24 flex-1 px-2 py-1 text-center border-r">
            <div>{day.toFormat('EEE')}</div>
            <div className="text-sm text-gray-500">{day.toFormat('MMM d')}</div>
          </div>
        ))}
      </div>

      <div className="flex">
        <div className="w-16">
          {TIME_SLOTS.map((slot, i) => (
            <div key={i} className="h-10 flex justify-end items-center pr-2 text-xs text-gray-400">
              {format(slot, 'h:mm a')}
            </div>
          ))}
        </div>
        {weekDays.map(day => (
          <div key={day.toISO()} className="flex-1 border-r">
            {TIME_SLOTS.map((slot, i) => {
              const dayDt = TimeZoneService.fromJSDate(day.toJSDate(), userTimeZone);
              const slotDt = TimeZoneService.fromJSDate(slot, userTimeZone);
              const isAvailable = showAvailability && isTimeSlotAvailable(dayDt.toJSDate(), slotDt.toJSDate());
              const block = isAvailable ? getBlockForTimeSlot(dayDt.toJSDate(), slotDt.toJSDate()) : undefined;
              const appt = getAppointmentForTimeSlot(dayDt.toJSDate(), slotDt.toJSDate());
              const isStartOfBlock = block && slotDt.toFormat('HH:mm') === block.start.toFormat('HH:mm');
              const isEndOfBlock = block && slotDt.plus({ minutes: 30 }).toFormat('HH:mm') === block.end.toFormat('HH:mm');
              const isStartOfAppointment = appt && slotDt.toFormat('HH:mm') === appt.start.toFormat('HH:mm');

              return (
                <div key={i} className="h-10 border-b border-l">
                  <TimeSlot
                    day={dayDt.toJSDate()}
                    timeSlot={slot}
                    isAvailable={isAvailable}
                    currentBlock={block}
                    appointment={appt}
                    isStartOfBlock={!!isStartOfBlock}
                    isEndOfBlock={!!isEndOfBlock}
                    isStartOfAppointment={!!isStartOfAppointment}
                    handleAvailabilityBlockClick={() => {}}
                    onAppointmentClick={handleAppointmentClick}
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
