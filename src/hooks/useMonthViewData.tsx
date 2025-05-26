
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';

// Export the interface so other components can use it
export interface DayAvailabilityData {
  hasAvailability: boolean;
  displayHours: string;
}

interface MonthViewData {
  appointments: Appointment[];
  availabilityBlocks: AvailabilityBlock[];
  loading: boolean;
  error: Error | null;
  monthStart: DateTime;
  days: DateTime[];
  dayAvailabilityMap: Map<string, DayAvailabilityData>;
  dayAppointmentsMap: Map<string, Appointment[]>;
  availabilityByDay: Map<string, AvailabilityBlock[]>;
}

// Component name for logging
const COMPONENT_NAME = 'useMonthViewData';

export const useMonthViewData = (
  currentDate: Date,
  clinicianId: string | null,
  refreshTrigger: number = 0,
  externalAppointments: Appointment[] = [],
  userTimeZone: string = 'America/Chicago'
) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate month boundaries
  const monthStart = useMemo(() => {
    return DateTime.fromJSDate(currentDate).setZone(userTimeZone).startOf('month');
  }, [currentDate, userTimeZone]);

  const monthEnd = useMemo(() => {
    return monthStart.endOf('month');
  }, [monthStart]);

  // Generate calendar days (including days from previous/next month to fill grid)
  const days = useMemo(() => {
    const startOfCalendar = monthStart.startOf('week');
    const endOfCalendar = monthEnd.endOf('week');
    const totalDays = endOfCalendar.diff(startOfCalendar, 'days').days + 1;
    
    return Array.from({ length: totalDays }, (_, i) => 
      startOfCalendar.plus({ days: i })
    );
  }, [monthStart, monthEnd]);

  // Process appointments and availability data
  const { dayAppointmentsMap, dayAvailabilityMap, availabilityByDay } = useMemo(() => {
    const appointmentMap = new Map<string, Appointment[]>();
    const availabilityMap = new Map<string, DayAvailabilityData>();
    const availabilityBlockMap = new Map<string, AvailabilityBlock[]>();

    // Use external appointments if provided, otherwise use fetched appointments
    const appointmentsToProcess = externalAppointments.length > 0 ? externalAppointments : appointments;

    // Process appointments
    appointmentsToProcess.forEach(appointment => {
      if (!appointment.start_at) return;
      
      try {
        const appointmentDate = TimeZoneService.fromUTC(appointment.start_at, userTimeZone);
        const dateKey = appointmentDate.toFormat('yyyy-MM-dd');
        
        if (!appointmentMap.has(dateKey)) {
          appointmentMap.set(dateKey, []);
        }
        appointmentMap.get(dateKey)!.push(appointment);
      } catch (error) {
        console.error(`[${COMPONENT_NAME}] Error processing appointment:`, error);
      }
    });

    // Process availability blocks
    availabilityBlocks.forEach(block => {
      if (!block.start_at || !block.end_at) return;
      
      try {
        const blockStart = TimeZoneService.fromUTC(block.start_at, userTimeZone);
        const dateKey = blockStart.toFormat('yyyy-MM-dd');
        
        if (!availabilityBlockMap.has(dateKey)) {
          availabilityBlockMap.set(dateKey, []);
        }
        availabilityBlockMap.get(dateKey)!.push(block);
        
        // Create availability summary
        const blockEnd = TimeZoneService.fromUTC(block.end_at, userTimeZone);
        const startTime = TimeZoneService.formatTime(blockStart);
        const endTime = TimeZoneService.formatTime(blockEnd);
        
        availabilityMap.set(dateKey, {
          hasAvailability: true,
          displayHours: `${startTime}-${endTime}`
        });
      } catch (error) {
        console.error(`[${COMPONENT_NAME}] Error processing availability block:`, error);
      }
    });

    return {
      dayAppointmentsMap: appointmentMap,
      dayAvailabilityMap: availabilityMap,
      availabilityByDay: availabilityBlockMap
    };
  }, [appointments, availabilityBlocks, externalAppointments, userTimeZone]);

  useEffect(() => {
    const fetchData = async () => {
      if (!clinicianId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const isoStart = startOfMonth.toISOString();
        const isoEnd = endOfMonth.toISOString();

        // Fetch clinician data for availability
        const { data: clinicianData, error: clinicianError } = await supabase
          .from('clinicians')
          .select('*')
          .eq('id', clinicianId)
          .single();

        if (clinicianError) throw clinicianError;

        // Convert column-based availability to AvailabilityBlock format
        const blocks: AvailabilityBlock[] = [];
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        if (clinicianData) {
          days.forEach(day => {
            for (let slot = 1; slot <= 3; slot++) {
              const startKey = `clinician_availability_start_${day}_${slot}`;
              const endKey = `clinician_availability_end_${day}_${slot}`;
              
              const startTime = clinicianData[startKey];
              const endTime = clinicianData[endKey];

              if (startTime && endTime) {
                blocks.push({
                  id: `${clinicianData.id}-${day}-${slot}`,
                  clinician_id: clinicianData.id,
                  day_of_week: day,
                  start_at: startTime,
                  end_at: endTime,
                  is_active: true,
                  is_deleted: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            }
          });
        }

        setAvailabilityBlocks(blocks);

        // Fetch appointments if not using external ones
        if (externalAppointments.length === 0) {
          const { data: appointmentData, error: appointmentError } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinician_id', clinicianId)
            .gte('start_at', isoStart)
            .lte('end_at', isoEnd);

          if (appointmentError) throw appointmentError;
          setAppointments(appointmentData || []);
        }
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error(`[${COMPONENT_NAME}] Error fetching data:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentDate, clinicianId, refreshTrigger, externalAppointments]);

  return {
    appointments,
    availabilityBlocks,
    loading,
    error,
    monthStart,
    days,
    dayAvailabilityMap,
    dayAppointmentsMap,
    availabilityByDay,
  };
};
