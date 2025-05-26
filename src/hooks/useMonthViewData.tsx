import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';

interface MonthViewData {
  appointments: Appointment[];
  availabilityBlocks: AvailabilityBlock[];
  loading: boolean;
  error: Error | null;
}

// Component name for logging
const COMPONENT_NAME = 'useMonthViewData';

export const useMonthViewData = (
  currentDate: Date,
  clinicianId: string | null,
  refreshTrigger: number = 0
) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

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

        // Fetch availability - using column-based clinician data
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

        // Fetch appointments
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('clinician_id', clinicianId)
          .gte('start_at', isoStart)
          .lte('end_at', isoEnd);

        if (appointmentError) throw appointmentError;

        setAppointments(appointmentData || []);
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error(`[${COMPONENT_NAME}] Error fetching data:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentDate, clinicianId, refreshTrigger]);

  return {
    appointments,
    availabilityBlocks,
    loading,
    error,
  };
};
