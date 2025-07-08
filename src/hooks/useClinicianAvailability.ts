
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
            clinician_availability_start_utc_monday_1, clinician_availability_end_utc_monday_1,
            clinician_availability_start_utc_monday_2, clinician_availability_end_utc_monday_2,
            clinician_availability_start_utc_monday_3, clinician_availability_end_utc_monday_3,
            clinician_availability_start_utc_tuesday_1, clinician_availability_end_utc_tuesday_1,
            clinician_availability_start_utc_tuesday_2, clinician_availability_end_utc_tuesday_2,
            clinician_availability_start_utc_tuesday_3, clinician_availability_end_utc_tuesday_3,
            clinician_availability_start_utc_wednesday_1, clinician_availability_end_utc_wednesday_1,
            clinician_availability_start_utc_wednesday_2, clinician_availability_end_utc_wednesday_2,
            clinician_availability_start_utc_wednesday_3, clinician_availability_end_utc_wednesday_3,
            clinician_availability_start_utc_thursday_1, clinician_availability_end_utc_thursday_1,
            clinician_availability_start_utc_thursday_2, clinician_availability_end_utc_thursday_2,
            clinician_availability_start_utc_thursday_3, clinician_availability_end_utc_thursday_3,
            clinician_availability_start_utc_friday_1, clinician_availability_end_utc_friday_1,
            clinician_availability_start_utc_friday_2, clinician_availability_end_utc_friday_2,
            clinician_availability_start_utc_friday_3, clinician_availability_end_utc_friday_3,
            clinician_availability_start_utc_saturday_1, clinician_availability_end_utc_saturday_1,
            clinician_availability_start_utc_saturday_2, clinician_availability_end_utc_saturday_2,
            clinician_availability_start_utc_saturday_3, clinician_availability_end_utc_saturday_3,
            clinician_availability_start_utc_sunday_1, clinician_availability_end_utc_sunday_1,
            clinician_availability_start_utc_sunday_2, clinician_availability_end_utc_sunday_2,
            clinician_availability_start_utc_sunday_3, clinician_availability_end_utc_sunday_3
          `)
          .eq('id', clinicianId)
          .single();

        if (error) throw error;

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const availabilitySlots: AvailabilitySlot[] = [];
        const clinicianTimeZone = data.clinician_time_zone || 'America/New_York';
        
        days.forEach(day => {
          for (let i = 1; i <= 3; i++) {
            const startUtcKey = `clinician_availability_start_utc_${day}_${i}`;
            const endUtcKey = `clinician_availability_end_utc_${day}_${i}`;
            const startUtc = data[startUtcKey];
            const endUtc = data[endUtcKey];
            
            if (startUtc && endUtc) {
              // Convert UTC timestamps to local time strings for RBC display
              const startLocal = fromUTC(startUtc, clinicianTimeZone);
              const endLocal = fromUTC(endUtc, clinicianTimeZone);
              
              availabilitySlots.push({ 
                day, 
                slot: i, 
                startTime: startLocal.toFormat('HH:mm'),
                endTime: endLocal.toFormat('HH:mm'),
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
