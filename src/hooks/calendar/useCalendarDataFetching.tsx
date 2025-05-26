
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { ClinicianColumnData } from '@/types/availability';
import { PartialClientDetails } from '@/types/client';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { appointmentsCache, clientsCache } from '@/utils/cacheUtils';

// Component name for logging
const COMPONENT_NAME = 'useCalendarDataFetching';

/**
 * Hook for fetching calendar data (appointments, clients, and clinician availability)
 * Refactored to use clinician table columns directly for availability data
 */
export const useCalendarDataFetching = (
  clinicianId: string | null,
  dateRange: { start: DateTime, end: DateTime },
  refreshTrigger = 0,
  externalAppointments: Appointment[] = []
) => {
  // State variables
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Map<string, PartialClientDetails>>(new Map());
  const [clinicianData, setClinicianData] = useState<ClinicianColumnData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Add detailed logging for each fetch operation
  console.log(`[${COMPONENT_NAME}] Hook initialized with:`, {
    clinicianId,
    dateRange: {
      start: dateRange.start.toISO(),
      end: dateRange.end.toISO()
    },
    refreshTrigger,
    externalAppointmentsCount: externalAppointments.length
  });

  // Fetch clinician data for availability
  const fetchClinicianData = useCallback(async (clinicianId: string): Promise<ClinicianColumnData | null> => {
    console.log(`[${COMPONENT_NAME}] Fetching clinician data for ID:`, clinicianId);
    
    try {
      const { data, error } = await supabase
        .from('clinicians')
        .select('*')
        .eq('id', clinicianId)
        .single();
        
      if (error) {
        console.error(`[${COMPONENT_NAME}] Clinician query error:`, error);
        throw error;
      }
      
      console.log(`[${COMPONENT_NAME}] Clinician data fetched successfully:`, {
        id: data?.id,
        email: data?.clinician_email,
        timezone: data?.clinician_time_zone,
        hasAvailabilityData: !!(data?.clinician_availability_start_monday_1 || data?.clinician_availability_start_tuesday_1)
      });
      
      return data;
    } catch (error) {
      console.error(`[${COMPONENT_NAME}] Error fetching clinician data:`, error);
      return null;
    }
  }, []);

  // Fetch all calendar data
  useEffect(() => {
    const fetchData = async () => {
      console.log(`[${COMPONENT_NAME}] Starting data fetch...`);
      
      setLoading(true);
      setError(null);
      
      if (!clinicianId) {
        console.log(`[${COMPONENT_NAME}] No clinician ID provided, clearing data`);
        setAppointments([]);
        setClients(new Map());
        setClinicianData(null);
        setLoading(false);
        return;
      }

      try {
        // UTC date bounds
        const utcStart = dateRange.start.toUTC().toISO();
        const utcEnd = dateRange.end.toUTC().toISO();

        console.log(`[${COMPONENT_NAME}] Fetching data with date range:`, {
          utcStart,
          utcEnd,
          clinicianId
        });
        
        // 1. Fetch clinician data first
        console.log(`[${COMPONENT_NAME}] Step 1: Fetching clinician data...`);
        const fetchedClinicianData = await fetchClinicianData(clinicianId);
        setClinicianData(fetchedClinicianData);
        
        if (!fetchedClinicianData) {
          throw new Error('Failed to fetch clinician data - clinician may not exist');
        }
        
        // 2. Fetch appointments if not using external ones
        let appointmentData: any[] = [];
        if (externalAppointments.length === 0) {
          console.log(`[${COMPONENT_NAME}] Step 2: Fetching appointments...`);
          
          const { data: appointmentsResult, error: appointmentsError } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinician_id', clinicianId)
            .gte('start_at', utcStart)
            .lt('end_at', utcEnd)
            .order('start_at', { ascending: true });

          if (appointmentsError) {
            console.error(`[${COMPONENT_NAME}] Appointments query error:`, appointmentsError);
            throw appointmentsError;
          }
          
          appointmentData = appointmentsResult || [];
          console.log(`[${COMPONENT_NAME}] Appointments fetched:`, {
            count: appointmentData.length,
            samples: appointmentData.slice(0, 3).map(a => ({ id: a.id, start_at: a.start_at, client_id: a.client_id }))
          });
        } else {
          console.log(`[${COMPONENT_NAME}] Using external appointments:`, {
            count: externalAppointments.length
          });
          appointmentData = externalAppointments;
        }
        
        // 3. Fetch clients - only basic fields needed
        console.log(`[${COMPONENT_NAME}] Step 3: Fetching clients...`);
        
        const { data: clientsResult, error: clientsError } = await supabase
          .from('clients')
          .select('id, client_first_name, client_last_name, client_preferred_name')
          .eq('client_assigned_therapist', clinicianId.toString());

        if (clientsError) {
          console.error(`[${COMPONENT_NAME}] Clients query error:`, clientsError);
          // Don't throw here - clients might be optional
          console.warn(`[${COMPONENT_NAME}] Continuing without client data`);
        }
        
        const clientData = clientsResult || [];
        console.log(`[${COMPONENT_NAME}] Clients fetched:`, {
          count: clientData.length,
          samples: clientData.slice(0, 3).map(c => ({ id: c.id, name: `${c.client_first_name} ${c.client_last_name}` }))
        });
        
        // Process and set data
        setAppointments(appointmentData);
        
        const clientMap = new Map<string, PartialClientDetails>();
        clientData.forEach(client => {
          clientMap.set(client.id, {
            id: client.id,
            client_first_name: client.client_first_name,
            client_last_name: client.client_last_name,
            client_preferred_name: client.client_preferred_name
          });
        });
        setClients(clientMap);
        
        console.log(`[${COMPONENT_NAME}] Data fetch completed successfully:`, {
          appointmentsCount: appointmentData.length,
          clientsCount: clientMap.size,
          hasClinicianData: !!fetchedClinicianData
        });
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`[${COMPONENT_NAME}] Critical error during data fetch:`, error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicianId, dateRange.start, dateRange.end, refreshTrigger, externalAppointments, fetchClinicianData]);

  // Log final state
  useEffect(() => {
    console.log(`[${COMPONENT_NAME}] Final state:`, {
      loading,
      appointmentsCount: appointments.length,
      clientsCount: clients.size,
      hasClinicianData: !!clinicianData,
      hasError: !!error,
      errorMessage: error?.message
    });
  }, [loading, appointments, clients, clinicianData, error]);

  return {
    loading,
    appointments,
    clients,
    clinicianData,
    error
  };
};

export default useCalendarDataFetching;
