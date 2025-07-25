
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getClinicianById } from '@/hooks/useClinicianData';
import { TimeZoneService } from '@/utils/timeZoneService';

interface Client {
  id: string;
  displayName: string;
}

const ensureStringId = (id: string | null): string | null => {
  if (!id) return null;
  return id.toString().trim();
};

export const useCalendarState = (initialClinicianId: string | null = null) => {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showAvailability, setShowAvailability] = useState(true);
  const [selectedClinicianId, setSelectedClinicianId] = useState<string | null>(initialClinicianId);
  const [clinicians, setClinicians] = useState<Array<{ id: string; clinician_professional_name: string }>>([]);
  const [loadingClinicians, setLoadingClinicians] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [appointmentRefreshTrigger, setAppointmentRefreshTrigger] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userTimeZone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone); // Use browser timezone
  const [isLoadingTimeZone] = useState(false); // Never loading since we use browser timezone
  const [isMounted, setIsMounted] = useState(true);

  const formattedClinicianId = useMemo(() => ensureStringId(selectedClinicianId), [selectedClinicianId]);
  
  // Component mounting effect
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Removed timezone fetch function - now using browser timezone only

  // Stabilized clinicians fetch function
  const fetchClinicians = useCallback(async () => {
    if (!isMounted) return;
    
    setLoadingClinicians(true);
    try {
      const { data, error } = await supabase
        .from('clinicians')
        .select('id, clinician_professional_name')
        .order('clinician_professional_name');

      if (!isMounted) return;

      if (error) {
        console.error('[useCalendarState] Error fetching clinicians:', error);
        setClinicians([]);
        return;
      }

      setClinicians(data || []);
      
      if (!selectedClinicianId && data?.length > 0) {
        const primaryId = data[0]?.id;
        console.log('[useCalendarState] Setting default clinician:', {
          clinicianId: primaryId,
          name: data[0]?.clinician_professional_name
        });
        setSelectedClinicianId(primaryId);
      } else if (initialClinicianId) {
        console.log('[useCalendarState] Using provided initial clinician ID:', initialClinicianId);
        setSelectedClinicianId(initialClinicianId);
      }
    } catch (error) {
      console.error("[useCalendarState] Critical error in fetchClinicians:", error);
    } finally {
      if (isMounted) {
        setLoadingClinicians(false);
      }
    }
  }, [isMounted, selectedClinicianId, initialClinicianId]);

  // Stabilized clients fetch function - CLEANED UP to remove legacy blocked time filtering
  const fetchClientsForClinician = useCallback(async (clinicianId: string) => {
    if (!isMounted) return;
    
    console.log('[useCalendarState] Fetching clients for clinician ID:', clinicianId);
    setLoadingClients(true);
    setClients([]);
    
    try {
      const clinicianRecord = await getClinicianById(clinicianId);
      
      if (!isMounted) return;
      
      console.log('[useCalendarState] Clinician record returned:', !!clinicianRecord);
      
      if (!clinicianRecord) {
        console.error('[useCalendarState] Could not find clinician with ID:', clinicianId);
        setLoadingClients(false);
        return;
      }
      
      const databaseClinicianId = clinicianRecord.id;
      console.log('[useCalendarState] Database-retrieved clinician ID:', databaseClinicianId);
      
      // CLEANED: Removed .neq('id', BLOCKED_TIME_CLIENT_ID) filter - no more legacy filtering needed
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id, client_first_name, client_preferred_name, client_last_name')
        .eq('client_assigned_therapist', databaseClinicianId.toString())
        .order('client_last_name');
        
      if (!isMounted) return;
        
      if (error) {
        console.error('[useCalendarState] Error fetching clients:', error);
      } else {
        console.log(`[useCalendarState] Found ${clientData?.length || 0} clients for clinician:`, databaseClinicianId);
        
        const formattedClients = (clientData || []).map(client => ({
          id: client.id,
          displayName: `${client.client_preferred_name || client.client_first_name || ''} ${client.client_last_name || ''}`.trim() || 'Unnamed Client'
        }));
        
        setClients(formattedClients);
      }
    } catch (error) {
      console.error('[useCalendarState] Error fetching clients:', error);
    } finally {
      if (isMounted) {
        setLoadingClients(false);
      }
    }
  }, [isMounted]);

  // Removed timezone loading effect - now using browser timezone only

  // Load clinicians - STABILIZED
  useEffect(() => {
    if (!isMounted) return;
    
    fetchClinicians();
  }, [fetchClinicians, isMounted]);

  // Load clients for selected clinician - STABILIZED
  useEffect(() => {
    if (!formattedClinicianId || !isMounted) return;
    
    fetchClientsForClinician(formattedClinicianId);
  }, [formattedClinicianId, fetchClientsForClinician, isMounted]);

  // Refresh callback
  const triggerAppointmentRefresh = useCallback(() => {
    setAppointmentRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    view,
    setView,
    showAvailability,
    setShowAvailability,
    selectedClinicianId: formattedClinicianId,
    setSelectedClinicianId,
    clinicians,
    loadingClinicians,
    currentDate,
    setCurrentDate,
    clients,
    loadingClients,
    appointmentRefreshTrigger,
    triggerAppointmentRefresh,
    isDialogOpen,
    setIsDialogOpen,
    userTimeZone,
    isLoadingTimeZone
  };
};
