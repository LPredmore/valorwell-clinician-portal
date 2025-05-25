import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { clientsCache } from '@/utils/cacheUtils';
import { getClinicianById } from '@/hooks/useClinicianData';

// Component name for logging
const COMPONENT_NAME = 'useClientFetcher';

interface Client {
  id: string;
  displayName: string;
}

/**
 * Hook for fetching client data for a clinician
 * Extracted from useCalendarState for better separation of concerns
 */
export const useClientFetcher = (
  clinicianId: string | null,
  setLastError: (error: Error | null) => void
) => {
  // State variables
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Optimized client fetch with caching and memoization
  const fetchClientsForClinician = useCallback(async (clinicianId: string) => {
    if (!clinicianId) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Not fetching clients: clinicianId is null');
      return;
    }
    
    setLoadingClients(true);
    setLastError(null);
    
    try {
      // Check cache first
      const cacheKey = `clinician:${clinicianId}`;
      const cachedClients = clientsCache.get(cacheKey);
      
      if (cachedClients) {
        CalendarDebugUtils.log(COMPONENT_NAME, 'Using cached clients data', {
          clinicianId,
          count: cachedClients.length
        });
        
        setClients(cachedClients);
        setLoadingClients(false);
        return;
      }
      
      // Cache miss - fetch from database
      const fetchStartTime = performance.now();
      
      // First, fetch the clinician record to get the correctly formatted ID
      const clinicianRecord = await getClinicianById(clinicianId);
      
      if (!clinicianRecord) {
        throw new Error(`Could not find clinician with ID: ${clinicianId}`);
      }
      
      // Use the database-retrieved ID to ensure exact format match
      const databaseClinicianId = clinicianRecord.id;
      
      // Query clients assigned by current clinician_id relationship
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id, client_first_name, client_preferred_name, client_last_name')
        .eq('client_assigned_therapist', databaseClinicianId.toString())
        .order('client_last_name');
        
      const fetchDuration = performance.now() - fetchStartTime;
      CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'fetch-clients', fetchDuration);
        
      if (error) {
        throw new Error(`Error fetching clients: ${error.message}`);
      }
      
      // Format client data for display
      const formattedClients = (clientData || []).map(client => ({
        id: client.id,
        displayName: `${client.client_preferred_name || client.client_first_name || ''} ${client.client_last_name || ''}`.trim() || 'Unnamed Client'
      }));
      
      // Update cache
      clientsCache.set(cacheKey, formattedClients);
      
      setClients(formattedClients);
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'Clients fetched and processed', {
        clinicianId: databaseClinicianId,
        count: formattedClients.length
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error fetching clients', err);
      setLastError(err);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, [setLastError]);

  // Load clients for selected clinician
  useEffect(() => {
    if (clinicianId) {
      fetchClientsForClinician(clinicianId);
    } else {
      setClients([]);
    }
  }, [clinicianId, fetchClientsForClinician]);

  return {
    clients,
    loadingClients,
    refreshClients: () => clinicianId && fetchClientsForClinician(clinicianId)
  };
};

export default useClientFetcher;