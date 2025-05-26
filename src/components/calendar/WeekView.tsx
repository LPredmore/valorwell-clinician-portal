
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useWeekViewDataSimplified } from './week-view/useWeekViewDataSimplified';
import { TimeBlock, AppointmentBlock } from './week-view/types';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './week-view/TimeSlot';
import { Button } from '@/components/ui/button';
import { AvailabilityBlock } from '@/types/availability';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';
import { Appointment } from '@/types/appointment';
import CalendarErrorBoundary from './CalendarErrorBoundary';

interface WeekViewProps {
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
  showAvailability?: boolean;
  refreshTrigger?: number;
  appointments?: any[];
  onAppointmentClick?: (appointment: any) => void;
  onAvailabilityClick?: (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => void;
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  currentDate?: Date;
  isLoading?: boolean;
  error?: any;
  onAppointmentDelete?: (appointmentId: string) => void;
}

// Generate time slots for the day (30-minute intervals)
const START_HOUR = 7; // 7 AM
const END_HOUR = 19; // 7 PM
const INTERVAL_MINUTES = 30;

const TIME_SLOTS: Date[] = [];
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0); // Reset to midnight

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
  currentDate,
  onAppointmentUpdate,
  onAppointmentDelete,
  isLoading,
  error,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] = useState(false);
  
  console.log('[WeekView] Rendering with props:', {
    daysCount: days.length,
    appointmentsCount: appointments?.length || 0,
    clinicianId: selectedClinicianId,
    timeZone: userTimeZone,
    isLoading,
    hasError: !!error
  });

  const {
    loading: hookLoading,
    error: hookError,
    weekDays,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  } = useWeekViewDataSimplified(
    days,
    selectedClinicianId,
    refreshTrigger,
    appointments,
    (id: string) => `Client ${id}`,
    userTimeZone
  );

  // Handle click on an availability block
  const handleAvailabilityBlockClick = (day: Date, block: TimeBlock) => {
    console.log('[WeekView] Availability block clicked:', {
      day: format(day, 'yyyy-MM-dd'),
      start: block.start.toFormat('HH:mm'),
      end: block.end.toFormat('HH:mm'),
    });
    setSelectedBlock(block);
    
    if (onAvailabilityClick) {
      const availabilityBlock: AvailabilityBlock = {
        id: block.availabilityIds?.[0] || 'unknown',
        clinician_id: selectedClinicianId || '',
        start_at: block.start.toUTC().toISO(),
        end_at: block.end.toUTC().toISO(),
        is_active: true
      };
      
      onAvailabilityClick(day, availabilityBlock);
    }
  };

  // Handle click on an appointment block
  const handleAppointmentClick = (appointment: any) => {
    console.log('[WeekView] Appointment clicked:', {
      id: appointment.id,
      clientName: appointment.clientName,
      start_at: appointment.start_at,
      end_at: appointment.end_at
    });
    
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      setSelectedAppointment(originalAppointment);
    } else {
      const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments || []);
      setSelectedAppointment(fullAppointment);
    }
    setIsAppointmentDetailsOpen(true);
    
    if (onAppointmentClick) {
      onAppointmentClick(originalAppointment || appointment);
    }
  };

  // Get a formatted time string for display
  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  if (hookLoading || isLoading) {
    return <div className="flex justify-center items-center h-32">Loading calendar...</div>;
  }

  if (hookError || error) {
    return (
      <div className="flex justify-center items-center h-32 text-red-600">
        Error loading calendar: {hookError || error?.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <CalendarErrorBoundary>
      <div className="flex flex-col">
        {/* AppointmentDetailsDialog */}
        <AppointmentDetailsDialog 
          isOpen={isAppointmentDetailsOpen}
          onClose={() => {
            setIsAppointmentDetailsOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onAppointmentUpdated={() => {
            if (onAppointmentUpdate) {
              onAppointmentUpdate("refresh-trigger", "", "");
            }
            setIsAppointmentDetailsOpen(false);
            setSelectedAppointment(null);
          }}
          userTimeZone={userTimeZone}
        />

        {/* Time column headers */}
        <div className="flex">
          <div className="w-16 flex-shrink-0"></div>
          {weekDays.map(day => (
            <div 
              key={day.toISO()} 
              className="w-24 flex-1 px-2 py-1 font-semibold text-center border-r last:border-r-0"
            >
              <div className="text-sm">{day.toFormat('EEE')}</div>
              <div className="text-xs">{day.toFormat('MMM d')}</div>
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        <div className="flex">
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0">
            {TIME_SLOTS.map((timeSlot, i) => (
              <div key={i} className="h-10 flex items-center justify-end pr-2 text-xs text-gray-500">
                {formatTime(timeSlot)}
              </div>
            ))}
          </div>

          {/* Days columns */}
          {weekDays.map(day => (
            <div key={day.toISO() || ''} className="flex-1 border-r last:border-r-0">
              {TIME_SLOTS.map((timeSlot, i) => {
                const dayDt = TimeZoneService.fromJSDate(day.toJSDate(), userTimeZone);
                const timeSlotDt = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
                
                const isAvailable = showAvailability && isTimeSlotAvailable(
                  dayDt.toJSDate(), 
                  timeSlotDt.toJSDate()
                );
                
                const currentBlock = isAvailable ? getBlockForTimeSlot(
                  dayDt.toJSDate(), 
                  timeSlotDt.toJSDate()
                ) : undefined;
                
                const appointment = getAppointmentForTimeSlot(
                  dayDt.toJSDate(), 
                  timeSlotDt.toJSDate()
                );

                return (
                  <div
                    key={i}
                    className={`h-10 border-b border-l first:border-l-0 group 
                                ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    <TimeSlot
                      day={dayDt.toJSDate()}
                      timeSlot={timeSlot}
                      isAvailable={isAvailable}
                      currentBlock={currentBlock}
                      appointment={appointment}
                      isStartOfBlock={false}
                      isEndOfBlock={false}
                      isStartOfAppointment={false}
                      isEndOfAppointment={false}
                      handleAvailabilityBlockClick={handleAvailabilityBlockClick}
                      onAppointmentClick={handleAppointmentClick}
                      onAppointmentDragStart={() => {}}
                      onAppointmentDragOver={() => {}}
                      onAppointmentDrop={() => {}}
                      originalAppointments={appointments}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Debug section */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="text-lg font-semibold">Debug Info</h3>
            <p>Clinician ID: {selectedClinicianId || 'None'}</p>
            <p>Time Blocks: {timeBlocks.length}</p>
            <p>Appointments: {appointmentBlocks.length}</p>
            <p>User Timezone: {userTimeZone}</p>
          </div>
        )}
      </div>
    </CalendarErrorBoundary>
  );
};

export default WeekView;
