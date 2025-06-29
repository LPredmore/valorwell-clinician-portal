
import React, { useMemo } from 'react';
import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';
import { useAppointments } from '@/hooks/useAppointments';
import { startOfWeek, endOfWeek } from 'date-fns';

interface WeeklyCalendarGridProps {
  currentDate: Date;
  clinicianId: string;
  userTimeZone: string;
  onAvailabilityClick?: (date: DateTime, startTime: DateTime, endTime: DateTime) => void;
  onAppointmentClick?: (appointment: any) => void;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

const WeeklyCalendarGrid: React.FC<WeeklyCalendarGridProps> = ({
  currentDate,
  clinicianId,
  userTimeZone,
  onAvailabilityClick,
  onAppointmentClick
}) => {
  // Calculate week range for appointments query
  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate), [currentDate]);

  // Fetch appointments for the current week with refresh trigger
  const { appointments, isLoading: appointmentsLoading } = useAppointments(
    clinicianId,
    weekStart,
    weekEnd,
    userTimeZone,
    0 // No refresh trigger needed for now
  );

  // Debug logging for appointments
  console.log('[WeeklyCalendarGrid] Appointments data:', {
    appointmentsCount: appointments?.length || 0,
    userTimeZone,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    clinicianId,
    appointments: appointments?.map(apt => ({
      id: apt.id,
      start_at: apt.start_at,
      end_at: apt.end_at,
      appointment_timezone: apt.appointment_timezone,
      clientName: apt.clientName
    }))
  });

  // Robust timezone fallback function
  const getAppointmentTimezone = (appointment: any, fallbackTimezone: string) => {
    if (appointment.appointment_timezone) {
      return appointment.appointment_timezone;
    }
    console.warn(`Appointment ${appointment.id} missing timezone, using fallback: ${fallbackTimezone}`);
    return fallbackTimezone || 'America/New_York';
  };

  // Calculate dynamic time range based on appointments
  const [startHour, endHour] = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      // Default range if no appointments
      console.log('[WeeklyCalendarGrid] No appointments, using default time range 8am-6pm');
      return [8, 18]; // 8am–6pm
    }

    // Get all start and end hours from appointments
    const allHours = appointments.flatMap(apt => {
      try {
        const tz = getAppointmentTimezone(apt, userTimeZone);
        const startHour = DateTime.fromISO(apt.start_at, { zone: 'utc' }).setZone(tz).hour;
        const endHour = DateTime.fromISO(apt.end_at, { zone: 'utc' }).setZone(tz).hour;
        
        console.log(`[WeeklyCalendarGrid] Appointment ${apt.id} time range:`, {
          startHour,
          endHour,
          timezone: tz,
          start_at: apt.start_at,
          end_at: apt.end_at
        });
        
        return [startHour, endHour];
      } catch (error) {
        console.error(`[WeeklyCalendarGrid] Error processing appointment ${apt.id} time:`, error);
        return [9, 17]; // Fallback to default business hours
      }
    });

    // Add a buffer (e.g., 1 hour before/after)
    const minHour = Math.max(0, Math.min(...allHours) - 1);
    const maxHour = Math.min(23, Math.max(...allHours) + 1);
    
    console.log('[WeeklyCalendarGrid] Dynamic time range calculated:', {
      appointmentHours: allHours,
      minHour,
      maxHour,
      buffer: '1 hour padding'
    });
    
    return [minHour, maxHour];
  }, [appointments, userTimeZone]);

  // Generate time slots based on dynamic range
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    console.log('[WeeklyCalendarGrid] Generating time slots:', {
      startHour,
      endHour,
      totalHours: endHour - startHour + 1
    });
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push({
        hour,
        minute: 0,
        label: DateTime.fromObject({ hour, minute: 0 }).toFormat('h:mm a')
      });
      if (hour < endHour) { // Don't add 30-minute slot for the last hour
        slots.push({
          hour,
          minute: 30,
          label: DateTime.fromObject({ hour, minute: 30 }).toFormat('h:mm a')
        });
      }
    }
    
    console.log('[WeeklyCalendarGrid] Generated time slots:', {
      slotsCount: slots.length,
      firstSlot: slots[0]?.label,
      lastSlot: slots[slots.length - 1]?.label
    });
    
    return slots;
  }, [startHour, endHour]);

  // Generate days of the week
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeekDate = DateTime.fromJSDate(weekStart).setZone(userTimeZone);
    
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeekDate.plus({ days: i }));
    }
    return days;
  }, [weekStart, userTimeZone]);

  // Render appointments for a specific time slot
  const renderAppointmentsInSlot = (day: DateTime, slot: TimeSlot) => {
    if (!appointments || !userTimeZone) {
      console.log('[WeeklyCalendarGrid] No appointments or timezone data available');
      return null;
    }
    
    const slotAppointments = appointments.filter(apt => {
      try {
        // Use robust timezone handling
        const appointmentTimezone = getAppointmentTimezone(apt, userTimeZone);
        
        // Convert appointment UTC time to display timezone for comparison
        const aptStart = DateTime.fromISO(apt.start_at, { zone: 'utc' })
          .setZone(appointmentTimezone);
        const aptEnd = DateTime.fromISO(apt.end_at, { zone: 'utc' })
          .setZone(appointmentTimezone);
        
        const slotStart = day.set({ 
          hour: slot.hour, 
          minute: slot.minute 
        });
        const slotEnd = slotStart.plus({ minutes: 30 });
        
        // Check if appointment overlaps with this time slot
        const overlaps = aptStart < slotEnd && aptEnd > slotStart;
        
        if (overlaps) {
          console.log(`[WeeklyCalendarGrid] Appointment ${apt.id} overlaps with slot:`, {
            aptStart: aptStart.toFormat('yyyy-MM-dd HH:mm'),
            aptEnd: aptEnd.toFormat('yyyy-MM-dd HH:mm'),
            slotStart: slotStart.toFormat('yyyy-MM-dd HH:mm'),
            slotEnd: slotEnd.toFormat('yyyy-MM-dd HH:mm'),
            appointmentTimezone
          });
        }
        
        return overlaps;
      } catch (error) {
        console.error(`[WeeklyCalendarGrid] Error processing appointment ${apt.id}:`, error);
        return false; // Don't display appointments that cause errors
      }
    });

    if (slotAppointments.length === 0) {
      return null;
    }

    return slotAppointments.map(apt => {
      try {
        const appointmentTimezone = getAppointmentTimezone(apt, userTimeZone);
        const displayTime = DateTime.fromISO(apt.start_at, { zone: 'utc' })
          .setZone(appointmentTimezone)
          .toFormat('h:mm a');
          
        return (
          <div 
            key={apt.id} 
            className="appointment-block bg-blue-500 text-white p-1 rounded text-xs cursor-pointer hover:bg-blue-600 mb-1"
            onClick={() => onAppointmentClick?.(apt)}
            title={`${apt.clientName || 'Client'} - ${displayTime}`}
          >
            <div className="font-medium truncate">{apt.clientName || 'Client'}</div>
            <div className="text-xs opacity-90">{displayTime}</div>
          </div>
        );
      } catch (error) {
        console.error(`[WeeklyCalendarGrid] Error rendering appointment ${apt.id}:`, error);
        return (
          <div 
            key={apt.id} 
            className="appointment-block bg-red-500 text-white p-1 rounded text-xs"
            title="Error loading appointment"
          >
            <div className="font-medium truncate">Error</div>
          </div>
        );
      }
    }).filter(Boolean);
  };

  if (appointmentsLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-8 border-b border-gray-200">
        {/* Time column header */}
        <div className="p-4 bg-gray-50 font-medium text-sm text-gray-600 border-r border-gray-200">
          Time
        </div>
        
        {/* Day headers */}
        {weekDays.map((day) => (
          <div key={day.toISODate()} className="p-4 bg-gray-50 text-center border-r border-gray-200 last:border-r-0">
            <div className="font-medium text-sm text-gray-900">
              {day.toFormat('EEE')}
            </div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {day.toFormat('d')}
            </div>
            <div className="text-xs text-gray-500">
              {day.toFormat('MMM')}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots and appointments */}
      <div className="divide-y divide-gray-100">
        {timeSlots.map((slot) => (
          <div key={`${slot.hour}-${slot.minute}`} className="grid grid-cols-8 min-h-[60px]">
            {/* Time label */}
            <div className="p-3 bg-gray-50 text-xs text-gray-600 font-medium border-r border-gray-100 flex items-start">
              {slot.label}
            </div>
            
            {/* Day columns */}
            {weekDays.map((day) => (
              <div 
                key={`${day.toISODate()}-${slot.hour}-${slot.minute}`}
                className="p-2 border-r border-gray-100 last:border-r-0 hover:bg-gray-50 cursor-pointer min-h-[60px]"
                onClick={() => {
                  if (onAvailabilityClick) {
                    const slotStart = day.set({ hour: slot.hour, minute: slot.minute });
                    const slotEnd = slotStart.plus({ minutes: 30 });
                    onAvailabilityClick(day, slotStart, slotEnd);
                  }
                }}
              >
                {renderAppointmentsInSlot(day, slot)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-2 text-xs text-gray-600 border-t">
          <strong>Debug:</strong> {appointments?.length || 0} appointments loaded for clinician {clinicianId} 
          in timezone {userTimeZone} | Time range: {startHour}:00 - {endHour}:00
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendarGrid;
