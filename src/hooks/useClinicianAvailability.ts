
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AvailabilitySlot {
  day: string;           // "monday"… "sunday"
  slot: number;          // 1–3
  startTime: string;     // "09:00"
  endTime: string;       // "17:00"
}

export function useClinicianAvailability(
  clinicianId: string | null, 
  weekStart: Date,
  weekEnd: Date,
  refreshTrigger = 0
) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const { toast } = useToast();
  
  // Create stable cache key for memoization using primitive values
  const cacheKey = useMemo(() => {
    if (!clinicianId) return null;
    return `${clinicianId}-${weekStart.getTime()}-${weekEnd.getTime()}-${refreshTrigger}`;
  }, [clinicianId, weekStart.getTime(), weekEnd.getTime(), refreshTrigger]);

  const loadedCacheKey = useRef<string | null>(null);

  useEffect(() => {
    // Prevent redundant calls with same parameters
    if (!cacheKey || cacheKey === loadedCacheKey.current) {
      console.log('[useClinicianAvailability] Skipping redundant call, cache key unchanged:', cacheKey);
      return;
    }
    
    const loadAvailability = async () => {
      try {
        console.log('[useClinicianAvailability] Loading availability for clinician:', {
          clinicianId,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          cacheKey,
          previousCacheKey: loadedCacheKey.current
        });

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

        if (error) throw error;

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const availabilitySlots: AvailabilitySlot[] = [];
        
        days.forEach(day => {
          for (let i = 1; i <= 3; i++) {
            const startKey = `clinician_availability_start_${day}_${i}`;
            const endKey = `clinician_availability_end_${day}_${i}`;
            const start = data[startKey];
            const end = data[endKey];
            
            if (start && end) {
              availabilitySlots.push({ 
                day, 
                slot: i, 
                startTime: start, 
                endTime: end 
              });
            }
          }
        });
        
        console.log('[useClinicianAvailability] Loaded availability slots:', availabilitySlots.length);
        
        // Mark this cache key as loaded BEFORE setting state to prevent race conditions
        loadedCacheKey.current = cacheKey;
        setSlots(availabilitySlots);
      } catch (err) {
        console.error('[useClinicianAvailability] Error loading availability:', err);
        loadedCacheKey.current = cacheKey; // Mark as attempted even on error
        toast({ 
          title: 'Error', 
          description: 'Unable to load availability', 
          variant: 'destructive' 
        });
      }
    };

    loadAvailability();
  }, [cacheKey, clinicianId, toast]);

  return slots;
}
