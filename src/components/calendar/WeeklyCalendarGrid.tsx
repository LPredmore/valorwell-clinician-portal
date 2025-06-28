
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAppointments } from '@/hooks/useAppointments';

interface WeeklyCalendarGridProps {
  currentDate: Date;
  clinicianId: string | null;
  userTimeZone: string;
  onAvailabilityClick?: (date: DateTime, startTime: DateTime, endTime: DateTime) => void;
  onAppointmentClick?: (appointment: any) => void;
}

const WeeklyCalendarGrid: React.FC<WeeklyCalendarGridProps> = ({
  currentDate,
  clinicianId,
  userTimeZone,
  onAvailabilityClick,
  onAppointmentClick
}) => {
  // Add availability state and fetching
  const [availabilityData, setAvailabilityData] = useState<any>({});

  // Calculate week boundaries for appointment fetching
  const weekBoundaries = useMemo(() => {
    const dt = TimeZoneService.fromJSDate(currentDate, userTimeZone);
    const weekStart = dt.startOf('week');
    const weekEnd = dt.endOf('week');
    return { weekStart, weekEnd, days: [] };
  }, [currentDate, userTimeZone]);

  // Fetch appointments for the current week
  const { 
    appointments, 
    isLoading: appointmentsLoading, 
    error: appointmentsError 
  } = useAppointments(
    clinicianId,
    weekBoundaries.weekStart.toJSDate(),
    weekBoundaries.weekEnd.toJSDate(),
    userTimeZone
  );

  // Fetch availability data - fetches ALL availability blocks (1, 2, 3)
  useEffect(() => {
    if (!clinicianId) return;
    
    const loadAvailability = async () => {
      try {
        const { data, error } = await supabase
          .from('clinicians')
          .select(`
            clinician_availability_start_monday_1, clinician_availability_end_monday_1,
            clinician_availability_start_monday_2, clinician_availability_end_monday_2,
            clinician_availability_start_monday_3, clinician_availability_end_monday_3,
            clinician_availability_start_tuesday_1, clinician_availability_end_tuesday_1,
            clinician_availability_start_tuesday_2, clinician_availability_end_tuesday_2,
            clinician_availability_start_tuesday_3, clinician_availability_end_tuesday_3,
            clinician_availability_start_wednesday_1, clinician_availability_end_wednesday_1,
            clinician_availability_start_wednesday_2, clinician_availability_end_wednesday_2,
            clinician_availability_start_wednesday_3, clinician_availability_end_wednesday_3,
            clinician_availability_start_thursday_1, clinician_availability_end_thursday_1,
            clinician_availability_start_thursday_2, clinician_availability_end_thursday_2,
            clinician_availability_start_thursday_3, clinician_availability_end_thursday_3,
            clinician_availability_start_friday_1, clinician_availability_end_friday_1,
            clinician_availability_start_friday_2, clinician_availability_end_friday_2,
            clinician_availability_start_friday_3, clinician_availability_end_friday_3,
            clinician_availability_start_saturday_1, clinician_availability_end_saturday_1,
            clinician_availability_start_saturday_2, clinician_availability_end_saturday_2,
            clinician_availability_start_saturday_3, clinician_availability_end_saturday_3,
            clinician_availability_start_sunday_1, clinician_availability_end_sunday_1,
            clinician_availability_start_sunday_2, clinician_availability_end_sunday_2,
            clinician_availability_start_sunday_3, clinician_availability_end_sunday_3
          `)
          .eq('id', clinicianId)
          .single();
        
        if (!error && data) {
          console.log('[WeeklyCalendarGrid] Loaded availability data:', data);
          setAvailabilityData(data);
        }
      } catch (error) {
        console.error('Error loading availability:', error);
      }
    };
    
    loadAvailability();
  }, [clinicianId]);

  // Updated helper function to check ALL availability blocks for a time slot
  const isTimeSlotAvailable = useCallback((dayName: string, hour: number, minute: number) => {
    if (!availabilityData) return false;
    
    const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    
    // Check all 3 potential blocks for the day
    for (let i = 1; i <= 3; i++) {
      const startTime = availabilityData[`clinician_availability_start_${dayName}_${i}`];
      const endTime = availabilityData[`clinician_availability_end_${dayName}_${i}`];
      
      if (startTime && endTime) {
        const startTimeFormatted = startTime.length === 5 ? `${startTime}:00` : startTime;
        const endTimeFormatted = endTime.length === 5 ? `${endTime}:00` : endTime;
        
        if (slotTime >= startTimeFormatted && slotTime < endTimeFormatted) {
          return true;
        }
      }
    }
    
    return false;
  }, [availabilityData]);

  // Helper function to render appointments in a time slot
  const renderAppointmentsInSlot = useCallback((day: DateTime, slot: { hour: number; minute: number }) => {
    if (!appointments || appointmentsLoading || !userTimeZone) return null;
    
    return appointments
      .filter(apt => {
        if (!apt.start_at || !apt.end_at) return false;
        
        try {
          // Convert appointment UTC time to user timezone for comparison
          const aptStart = TimeZoneService.fromUTC(apt.start_at, userTimeZone);
          const aptEnd = TimeZoneService.fromUTC(apt.end_at, userTimeZone);
          
          const slotStart = day.set({ 
            hour: slot.hour, 
            minute: slot.minute 
          });
          const slotEnd = slotStart.plus({ minutes: 30 }); // 30-min slots
          
          // Check if appointment overlaps with this slot
          return aptStart < slotEnd && aptEnd > slotStart;
        } catch (error) {
          console.error('Error converting appointment times:', error);
          return false;
        }
      })
      .map(apt => {
        try {
          const aptStart = TimeZoneService.fromUTC(apt.start_at, userTimeZone);
          return (
            <div 
              key={apt.id} 
              className="appointment-block bg-blue-500 text-white p-1 rounded text-xs cursor-pointer hover:bg-blue-600 mb-1"
              onClick={() => onAppointmentClick?.(apt)}
              title={`${apt.clientName || 'Unknown Client'} - ${aptStart.toFormat('h:mm a')}`}
            >
              <div className="font-medium truncate">{apt.clientName || 'Unknown'}</div>
              <div className="text-xs opacity-90">
                {aptStart.toFormat('h:mm a')}
              </div>
            </div>
          );
        } catch (error) {
          console.error('Error rendering appointment:', error);
          return null;
        }
      })
      .filter(Boolean);
  }, [appointments, appointmentsLoading, userTimeZone, onAppointmentClick]);

  // Memoized week boundaries calculation
  const weekDays = useMemo(() => {
    const dt = TimeZoneService.fromJSDate(currentDate, userTimeZone);
    const weekStart = dt.startOf('week');
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.plus({ days: i }));
    }
    return days;
  }, [currentDate, userTimeZone]);

  // Memoized time range configuration
  const timeConfig = useMemo(() => ({
    startHour: 8,
    endHour: 22 // 10 PM
  }), []);

  // Memoized time slots generation
  const timeSlots = useMemo(() => {
    console.log('[WeeklyCalendarGrid] Generating time slots');
    const slots = [];
    for (let hour = timeConfig.startHour; hour <= timeConfig.endHour; hour++) {
      slots.push({ hour, minute: 0 });
      if (hour < timeConfig.endHour) {
        slots.push({ hour, minute: 30 });
      }
    }
    return slots;
  }, [timeConfig]);

  // Memoized formatting functions
  const formatters = useMemo(() => ({
    formatTimeSlot: (hour: number, minute: number) => {
      const dt = DateTime.now().set({ hour, minute });
      return dt.toFormat('h:mm a');
    },
    getDayName: (date: DateTime) => date.toFormat('EEE'),
    getDayNumber: (date: DateTime) => date.toFormat('d'),
    isToday: (date: DateTime) => {
      const today = TimeZoneService.now(userTimeZone);
      return date.hasSame(today, 'day');
    }
  }), [userTimeZone]);

  // Memoized click handler
  const handleCellClick = useCallback((day: DateTime, slot: { hour: number; minute: number }) => {
    if (!onAvailabilityClick) return;
    
    const slotDateTime = day.set({ 
      hour: slot.hour, 
      minute: slot.minute 
    });
    const endDateTime = slotDateTime.plus({ minutes: 30 });
    onAvailabilityClick(day, slotDateTime, endDateTime);
  }, [onAvailabilityClick]);

  return (
    <Card className="p-4">
      <div className="grid grid-cols-8 gap-1 min-h-[600px]">
        {/* Time column header */}
        <div className="border-r border-gray-200">
          <div className="h-16 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            Time
          </div>
        </div>

        {/* Day headers */}
        {weekDays.map((day, index) => (
          <div key={day.toISO()} className="border-r border-gray-200 last:border-r-0">
            <div className="h-16 border-b border-gray-200 flex flex-col items-center justify-center">
              <div className="text-sm font-medium text-gray-900">
                {formatters.getDayName(day)}
              </div>
              <div className={`text-lg font-semibold ${
                formatters.isToday(day) ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {formatters.getDayNumber(day)}
              </div>
            </div>
          </div>
        ))}

        {/* Time slots */}
        {timeSlots.map((slot, slotIndex) => (
          <React.Fragment key={slotIndex}>
            {/* Time label */}
            <div className="border-r border-gray-200 h-12 flex items-center justify-end pr-2 text-xs text-gray-500">
              {slot.minute === 0 ? formatters.formatTimeSlot(slot.hour, slot.minute) : ''}
            </div>

            {/* Day cells with availability and appointment rendering */}
            {weekDays.map((day, dayIndex) => {
              const dayName = day.toFormat('cccc').toLowerCase();
              const isAvailableSlot = isTimeSlotAvailable(dayName, slot.hour, slot.minute);
              const appointmentBlocks = renderAppointmentsInSlot(day, slot);
              
              return (
                <div
                  key={`${slotIndex}-${dayIndex}`}
                  className={`border-r border-b border-gray-100 h-12 cursor-pointer transition-colors last:border-r-0 relative ${
                    isAvailableSlot 
                      ? 'bg-green-50 hover:bg-green-100' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleCellClick(day, slot)}
                >
                  {/* Availability indicator */}
                  {isAvailableSlot && appointmentBlocks?.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                  
                  {/* Appointment blocks */}
                  {appointmentBlocks && appointmentBlocks.length > 0 && (
                    <div className="absolute inset-0 p-0.5 overflow-hidden">
                      {appointmentBlocks}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      
      {/* Loading/Error states */}
      {appointmentsLoading && (
        <div className="text-center text-sm text-gray-500 mt-2">
          Loading appointments...
        </div>
      )}
      
      {appointmentsError && (
        <div className="text-center text-sm text-red-500 mt-2">
          Error loading appointments: {appointmentsError.message}
        </div>
      )}
    </Card>
  );
};

export default WeeklyCalendarGrid;
