
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fromUTC } from '@/utils/timezoneHelpers';

export interface AvailabilitySlot {
  day: string;           // "monday"… "sunday"
  slot: number;          // 1–3
  startTime: string;     // "09:00"
  endTime: string;       // "17:00"
  clinicianTimeZone: string; // clinician's timezone
}

export function useClinicianAvailability(
  clinicianId: string | null, 
  refreshTrigger = 0
) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!clinicianId) return;
    
    const loadAvailability = async () => {
      try {
        console.log('[useClinicianAvailability] Loading availability for clinician:', clinicianId);

        const { data, error } = await supabase
          .from('clinicians')
          .select(`
            clinician_time_zone,
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

        if (error) throw error;

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const availabilitySlots: AvailabilitySlot[] = [];
        const clinicianTimeZone = data.clinician_time_zone || 'America/New_York';
        
        days.forEach(day => {
          for (let i = 1; i <= 3; i++) {
            const startKey = `clinician_availability_start_${day}_${i}`;
            const endKey = `clinician_availability_end_${day}_${i}`;
            const startTime = data[startKey];
            const endTime = data[endKey];
            
            if (startTime && endTime) {
              // startTime and endTime are already in TIME format (HH:mm:ss), just convert to HH:mm
              const formattedStartTime = startTime.substring(0, 5); // "09:00:00" -> "09:00"
              const formattedEndTime = endTime.substring(0, 5);     // "17:00:00" -> "17:00"
              
              availabilitySlots.push({ 
                day, 
                slot: i, 
                startTime: formattedStartTime,
                endTime: formattedEndTime,
                clinicianTimeZone
              });
            }
          }
        });
        
        console.log('[useClinicianAvailability] Loaded availability slots:', availabilitySlots.length);
        setSlots(availabilitySlots);
      } catch (err) {
        console.error('[useClinicianAvailability] Error loading availability:', err);
        toast({ 
          title: 'Error', 
          description: 'Unable to load availability', 
          variant: 'destructive' 
        });
      }
    };

    loadAvailability();
  }, [clinicianId, refreshTrigger]);

  return slots;
}
