
import React, { useMemo, useState } from 'react';
import { useAppointments } from '@/hooks/useAppointments';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InternalAppointmentCard from './InternalAppointmentCard';
import CalendarLoadingState from './CalendarLoadingState';
import CalendarErrorState from './CalendarErrorState';

interface VirtualCalendarProps {
  clinicianId: string | null;
  currentDate: Date;
  userTimeZone: string;
  onNewAppointment?: (date: Date, time?: string) => void;
  onAppointmentClick?: (appointment: any) => void;
}

const VirtualCalendar: React.FC<VirtualCalendarProps> = ({
  clinicianId,
  currentDate,
  userTimeZone,
  onNewAppointment,
  onAppointmentClick,
}) => {
  // Calculate date range for fetching appointments (current week)
  const startDate = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const endDate = useMemo(() => endOfWeek(currentDate), [currentDate]);
  
  const { 
    appointments, 
    isLoading, 
    error,
    refetch 
  } = useAppointments(clinicianId || '', userTimeZone, 0);

  // Generate week days for the calendar grid
  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  // Filter appointments for the current week and group by date
  const appointmentsByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    appointments
      .filter(appointment => {
        const appointmentDate = new Date(appointment.start_at);
        return appointmentDate >= startDate && appointmentDate <= endDate;
      })
      .forEach(appointment => {
        const appointmentDate = new Date(appointment.start_at);
        const dateKey = format(appointmentDate, 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        
        grouped[dateKey].push(appointment);
      });
    
    // Sort appointments by start time for each date
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => 
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
    });
    
    return grouped;
  }, [appointments, startDate, endDate]);

  const handleTimeSlotClick = (day: Date, hour: number) => {
    const appointmentTime = new Date(day);
    appointmentTime.setHours(hour, 0, 0, 0);
    onNewAppointment?.(appointmentTime, `${hour.toString().padStart(2, '0')}:00`);
  };

  // Show error state
  if (error) {
    return (
      <CalendarErrorState
        message={`Error loading appointments: ${error}`}
        onRetry={refetch}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return <CalendarLoadingState message="Loading appointments..." />;
  }

  // Time slots for the day (8 AM to 6 PM)
  const timeSlots = Array.from({ length: 10 }, (_, i) => i + 8);

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Your Schedule</h3>
        </div>
        <Button 
          onClick={() => onNewAppointment?.(new Date())} 
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Week view calendar grid */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-8 bg-gray-50 border-b">
          <div className="p-3 text-center border-r font-medium text-sm">Time</div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-3 text-center border-r last:border-r-0">
              <div className="font-medium text-sm">{format(day, 'EEE')}</div>
              <div className="text-lg">{format(day, 'd')}</div>
              <div className="text-xs text-gray-500">{format(day, 'MMM')}</div>
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        {timeSlots.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
            {/* Time label */}
            <div className="p-3 border-r bg-gray-50 text-sm font-medium text-center">
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
            
            {/* Day cells */}
            {weekDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointmentsByDate[dateKey] || [];
              
              // Find appointments for this hour
              const hourAppointments = dayAppointments.filter(appointment => {
                const appointmentHour = new Date(appointment.start_at).getHours();
                return appointmentHour === hour;
              });

              return (
                <div 
                  key={`${day.toISOString()}-${hour}`} 
                  className="min-h-[60px] border-r last:border-r-0 p-1 relative hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleTimeSlotClick(day, hour)}
                >
                  {hourAppointments.map((appointment) => (
                    <InternalAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onClick={() => onAppointmentClick?.(appointment)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Appointments summary */}
      <div className="text-sm text-gray-600">
        Showing {appointments.length} appointments for this week
      </div>
    </div>
  );
};

export default VirtualCalendar;
