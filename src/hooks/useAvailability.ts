
import { useQuery } from '@tanstack/react-query';
import { AvailabilityService, AvailabilitySlot } from '@/utils/availabilityService';
import { addWeeks, subWeeks } from 'date-fns';

export interface ProcessedAvailability {
  id: string;
  date: Date;
  start_time: string;
  end_time: string;
  isException: boolean;
  day_of_week: string;
  timezone: string;
  utc_start_time: string;
  utc_end_time: string;
}

export const useAvailability = (
  clinicianId: string | null, 
  startDate: Date, 
  endDate: Date, 
  refreshTrigger: number
) => {
  console.log('[useAvailability] Hook called with:', {
    clinicianId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    refreshTrigger
  });

  return useQuery({
    queryKey: ['availability', clinicianId, startDate.toISOString(), endDate.toISOString(), refreshTrigger],
    queryFn: async () => {
      console.log('[useAvailability] Query function executing...');
      
      if (!clinicianId) {
        console.log('[useAvailability] No clinician ID provided');
        return [];
      }
      
      try {
        console.log('[useAvailability] Calling AvailabilityService.getAvailabilityInstances...');
        const slots = await AvailabilityService.getAvailabilityInstances(
          clinicianId,
          startDate,
          endDate,
          'America/New_York' // Default timezone, will be converted in UI
        );
        
        console.log('[useAvailability] Raw slots received:', slots);
        
        const processedSlots = slots.map((slot: AvailabilitySlot): ProcessedAvailability => ({
          id: slot.id,
          date: new Date(slot.specific_date),
          start_time: slot.start_time,
          end_time: slot.end_time,
          isException: false, // All from recurring pattern for now
          day_of_week: slot.day_of_week,
          timezone: slot.timezone,
          utc_start_time: slot.utc_start_time,
          utc_end_time: slot.utc_end_time
        }));
        
        console.log('[useAvailability] Processed slots:', processedSlots);
        return processedSlots;
      } catch (error) {
        console.error('[useAvailability] Error fetching availability:', error);
        throw error;
      }
    },
    enabled: !!clinicianId,
  });
};
