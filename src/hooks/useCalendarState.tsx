
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import { getClinicianTimeZone, getClinicianById } from '@/hooks/useClinicianData';
import { TimeZoneService } from '@/utils/timeZoneService';

interface Client {
  id: string;
  displayName: string;
}

// Helper function to ensure consistent ID format for database queries
const ensureStringId = (id: string | null): string | null => {
  if (!id) return null;
  
  // Ensure the ID is a clean string without any format issues
  return id.toString().trim();
};

export const useCalendarState = (initialClinicianId: string | null = null) => {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedClinicianId, setSelectedClinicianId] = useState<string | null>(initialClinicianId);
  const [clinicians, setClinicians] = useState<Array<{ id: string; clinician_professional_name: string }>>([]);
  const [loadingClinicians, setLoadingClinicians] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [appointmentRefreshTrigger, setAppointmentRefreshTrigger] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [isLoadingTimeZone, setIsLoadingTimeZone] = useState(true);

  const formattedClinicianId = ensureStringId(selectedClinicianId);
  
  // Log important state information
  useEffect(() => {
    console.log('[useCalendarState] Current state:', {
      view,
      clinicianId: formattedClinicianId,
      originalClinicianId: selectedClinicianId,
      timeZone: userTimeZone,
      isLoadingTimeZone,
      refreshTrigger: appointmentRefreshTrigger
    });
  }, [view, selectedClinicianId, formattedClinicianId, userTimeZone, isLoadingTimeZone, appointmentRefreshTrigger]);

  // Set user timezone from clinician or browser
  useEffect(() => {
    const fetchClinicianTimeZone = async () => {
      if (formattedClinicianId) {
        try {
          const timeZone = await getClinicianTimeZone(formattedClinicianId);
          if (timeZone) {
            setUserTimeZone(TimeZoneService.ensureIANATimeZone(timeZone));
          } else {
            // Fallback to browser timezone if clinician timezone is not set
            setUserTimeZone(TimeZoneService.ensureIANATimeZone(getUserTimeZone()));
          }
        } catch (error) {
          console.error("[useCalendarState] Error fetching clinician timezone:", error);
          // Fallback to browser timezone on error
          setUserTimeZone(TimeZoneService.ensureIANATimeZone(getUserTimeZone()));
        } finally {
          setIsLoadingTimeZone(false);
        }
      } else {
        // No clinician ID provided, use browser timezone
        setUserTimeZone(TimeZoneService.ensureIANATimeZone(getUserTimeZone()));
        setIsLoadingTimeZone(false);
      }
    };
    
    fetchClinicianTimeZone();
  }, [formattedClinicianId]);

  // Load clinicians
  useEffect(() => {
    const fetchClinicians = async () => {
      setLoadingClinicians(true);
      try {
        const { data, error } = await supabase
          .from('clinicians')
          .select('id, clinician_professional_name')
          .order('clinician_professional_name');

        if (error) {
          console.error('[useCalendarState] Error fetching clinicians:', error);
          setClinicians([]);
          return;
        }

        setClinicians(data);
        
        // Set default clinician if none is selected
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
        setLoadingClinicians(false);
      }
    };

    fetchClinicians();
  }, [initialClinicianId, selectedClinicianId]);

  // Load clients for selected clinician
  useEffect(() => {
    const fetchClientsForClinician = async () => {
      if (!formattedClinicianId) {
        console.log('[useCalendarState] Not fetching clients: clinicianId is null');
        return;
      }
      
      console.log('[useCalendarState] Fetching clients for clinician ID:', formattedClinicianId);
      setLoadingClients(true);
      setClients([]);
      
      try {
        // First, fetch the clinician record to get the correctly formatted ID from the database
        console.log('[useCalendarState] Calling getClinicianById with ID:', formattedClinicianId);
        const clinicianRecord = await getClinicianById(formattedClinicianId);
        console.log('[useCalendarState] Clinician record returned:', !!clinicianRecord);
        
        if (!clinicianRecord) {
          console.error('[useCalendarState] Could not find clinician with ID:', formattedClinicianId);
          setLoadingClients(false);
          return;
        }
        
        // Use the database-retrieved ID to ensure exact format match
        const databaseClinicianId = clinicianRecord.id;
        console.log('[useCalendarState] Database-retrieved clinician ID:', databaseClinicianId);
        
        // Query clients assigned by current clinician_id relationship
        // FIXED: Use client_assigned_therapist column instead of clinician_id
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('id, client_first_name, client_preferred_name, client_last_name')
          // Use client_assigned_therapist column which is TEXT type not UUID
          .eq('client_assigned_therapist', databaseClinicianId.toString())
          .order('client_last_name');
          
        if (error) {
          console.error('[useCalendarState] Error fetching clients:', error);
        } else {
          console.log(`[useCalendarState] Found ${clientData?.length || 0} clients for clinician:`, databaseClinicianId);
          
          // Format client data for display
          const formattedClients = (clientData || []).map(client => ({
            id: client.id,
            displayName: `${client.client_preferred_name || client.client_first_name || ''} ${client.client_last_name || ''}`.trim() || 'Unnamed Client'
          }));
          
          setClients(formattedClients);
        }
      } catch (error) {
        console.error('[useCalendarState] Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClientsForClinician();
  }, [formattedClinicianId]);

  return {
    view,
    setView,
    showAvailability,
    setShowAvailability,
    selectedClinicianId,
    setSelectedClinicianId,
    clinicians,
    loadingClinicians,
    currentDate,
    setCurrentDate,
    clients,
    loadingClients,
    appointmentRefreshTrigger,
    setAppointmentRefreshTrigger,
    isDialogOpen,
    setIsDialogOpen,
    userTimeZone,
    isLoadingTimeZone,
  };
};

export default useCalendarState;
