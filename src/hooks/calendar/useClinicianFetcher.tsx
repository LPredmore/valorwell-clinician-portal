import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { cliniciansCache } from '@/utils/cacheUtils';

// Component name for logging
const COMPONENT_NAME = 'useClinicianFetcher';

/**
 * Hook for fetching clinician data
 * Extracted from useCalendarState for better separation of concerns
 */
export const useClinicianFetcher = (
  initialClinicianId: string | null,
  selectedClinicianId: string | null,
  setSelectedClinicianId: (id: string | null) => void,
  setLastError: (error: Error | null) => void
) => {
  // State variables
  const [clinicians, setClinicians] = useState<Array<{ id: string; clinician_professional_name: string }>>([]);
  const [loadingClinicians, setLoadingClinicians] = useState(true);

  // Optimized clinician fetch with caching
  const fetchClinicians = useCallback(async () => {
    setLoadingClinicians(true);
    setLastError(null);
    
    try {
      // Check cache first
      const cachedClinicians = cliniciansCache.get('all');
      
      if (cachedClinicians) {
        CalendarDebugUtils.log(COMPONENT_NAME, 'Using cached clinicians data', {
          count: cachedClinicians.length
        });
        
        setClinicians(cachedClinicians);
        
        // Set default clinician if needed
        if (!selectedClinicianId && cachedClinicians.length > 0) {
          const primaryId = cachedClinicians[0]?.id;
          setSelectedClinicianId(primaryId);
        } else if (initialClinicianId) {
          setSelectedClinicianId(initialClinicianId);
        }
        
        setLoadingClinicians(false);
        return;
      }
      
      // Cache miss - fetch from database
      const fetchStartTime = performance.now();
      
      const { data, error } = await supabase
        .from('clinicians')
        .select('id, clinician_professional_name')
        .order('clinician_professional_name');

      const fetchDuration = performance.now() - fetchStartTime;
      CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'fetch-clinicians', fetchDuration);

      if (error) {
        throw new Error(`Error fetching clinicians: ${error.message}`);
      }

      // Update cache
      if (data) {
        cliniciansCache.set('all', data);
      }
      
      setClinicians(data || []);
      
      // Set default clinician if none is selected
      if (!selectedClinicianId && data?.length > 0) {
        const primaryId = data[0]?.id;
        CalendarDebugUtils.log(COMPONENT_NAME, 'Setting default clinician', {
          clinicianId: primaryId,
          name: data[0]?.clinician_professional_name
        });
        setSelectedClinicianId(primaryId);
      } else if (initialClinicianId) {
        CalendarDebugUtils.log(COMPONENT_NAME, 'Using provided initial clinician ID', {
          clinicianId: initialClinicianId
        });
        setSelectedClinicianId(initialClinicianId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error in fetchClinicians', err);
      setLastError(err);
    } finally {
      setLoadingClinicians(false);
    }
  }, [initialClinicianId, selectedClinicianId, setSelectedClinicianId, setLastError]);

  // Load clinicians on mount
  useEffect(() => {
    fetchClinicians();
  }, [fetchClinicians]);

  return {
    clinicians,
    loadingClinicians,
    refreshClinicians: fetchClinicians
  };
};

export default useClinicianFetcher;