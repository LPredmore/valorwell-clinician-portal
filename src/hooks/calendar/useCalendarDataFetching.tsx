import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { ClinicianColumnData } from '@/types/availability';
import { ClientDetails } from '@/types/client';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { appointmentsCache, clientsCache } from '@/utils/cacheUtils';

// Component name for logging
const COMPONENT_NAME = 'useCalendarDataFetching';

// Use ClientDetails as Client for backward compatibility
type Client = ClientDetails;

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
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [clinicianData, setClinicianData] = useState<ClinicianColumnData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Fetch clinician data for availability
  const fetchClinicianData = useCallback(async (clinicianId: string): Promise<ClinicianColumnData | null> => {
    try {
      // Use proper Supabase select syntax without column aliasing
      const { data, error } = await supabase
        .from('clinicians')
        .select(`
          id,
          clinician_first_name,
          clinician_last_name,
          clinician_professional_name,
          clinician_email,
          clinician_time_zone,
          clinician_bio,
          clinician_image_url,
          clinician_availability_start_monday_1,
          clinician_availability_end_monday_1,
          clinician_availability_timezone_monday_1,
          clinician_availability_start_monday_2,
          clinician_availability_end_monday_2,
          clinician_availability_timezone_monday_2,
          clinician_availability_start_monday_3,
          clinician_availability_end_monday_3,
          clinician_availability_timezone_monday_3,
          clinician_availability_start_tuesday_1,
          clinician_availability_end_tuesday_1,
          clinician_availability_timezone_tuesday_1,
          clinician_availability_start_tuesday_2,
          clinician_availability_end_tuesday_2,
          clinician_availability_timezone_tuesday_2,
          clinician_availability_start_tuesday_3,
          clinician_availability_end_tuesday_3,
          clinician_availability_timezone_tuesday_3,
          clinician_availability_start_wednesday_1,
          clinician_availability_end_wednesday_1,
          clinician_availability_timezone_wednesday_1,
          clinician_availability_start_wednesday_2,
          clinician_availability_end_wednesday_2,
          clinician_availability_timezone_wednesday_2,
          clinician_availability_start_wednesday_3,
          clinician_availability_end_wednesday_3,
          clinician_availability_timezone_wednesday_3,
          clinician_availability_start_thursday_1,
          clinician_availability_end_thursday_1,
          clinician_availability_timezone_thursday_1,
          clinician_availability_start_thursday_2,
          clinician_availability_end_thursday_2,
          clinician_availability_timezone_thursday_2,
          clinician_availability_start_thursday_3,
          clinician_availability_end_thursday_3,
          clinician_availability_timezone_thursday_3,
          clinician_availability_start_friday_1,
          clinician_availability_end_friday_1,
          clinician_availability_timezone_friday_1,
          clinician_availability_start_friday_2,
          clinician_availability_end_friday_2,
          clinician_availability_timezone_friday_2,
          clinician_availability_start_friday_3,
          clinician_availability_end_friday_3,
          clinician_availability_timezone_friday_3,
          clinician_availability_start_saturday_1,
          clinician_availability_end_saturday_1,
          clinician_availability_timezone_saturday_1,
          clinician_availability_start_saturday_2,
          clinician_availability_end_saturday_2,
          clinician_availability_timezone_saturday_2,
          clinician_availability_start_saturday_3,
          clinician_availability_end_saturday_3,
          clinician_availability_timezone_saturday_3,
          clinician_availability_start_sunday_1,
          clinician_availability_end_sunday_1,
          clinician_availability_timezone_sunday_1,
          clinician_availability_start_sunday_2,
          clinician_availability_end_sunday_2,
          clinician_availability_timezone_sunday_2,
          clinician_availability_start_sunday_3,
          clinician_availability_end_sunday_3,
          clinician_availability_timezone_sunday_3
        `)
        .eq('id', clinicianId)
        .single();
        
      if (error) {
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error fetching clinician data:', error);
        return null;
      }
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'Fetched clinician data for availability', {
        clinicianId,
        hasData: !!data,
        timezone: data?.clinician_time_zone
      });
      
      // Validate timezone format before returning
      if (data?.clinician_time_zone) {
        try {
          DateTime.local().setZone(data.clinician_time_zone);
        } catch (err) {
          CalendarDebugUtils.error(COMPONENT_NAME, 'Invalid timezone format in clinician data', {
            clinicianId,
            timezone: data.clinician_time_zone
          });
          data.clinician_time_zone = 'America/Chicago';
        }
      } else {
        // Set default timezone if missing
        if (data) {
          data.clinician_time_zone = 'America/Chicago';
        }
      }
      
      return data;
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Unexpected error fetching clinician data:', error);
      return null;
    }
  }, []);

  // Fetch all calendar data
  useEffect(() => {
    const fetchData = async () => {
      // Performance tracking
      const fetchStartTime = performance.now();
      
      CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'data-fetch-start', {
        clinicianId,
        refreshTrigger,
        dateRange: {
          start: dateRange.start.toISO(),
          end: dateRange.end.toISO()
        }
      });
      
      setLoading(true);
      setError(null);
      
      if (!clinicianId) {
        CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'no-clinician-id-provided', {
          clearingData: true
        });
        
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

        CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'date-range-calculation', {
          localStart: dateRange.start.toISO(),
          localEnd: dateRange.end.toISO(),
          utcStart,
          utcEnd
        });
        
        // Create cache keys for this data request
        const appointmentsCacheKey = `clinician:${clinicianId}:range:${utcStart}:${utcEnd}:refresh:${refreshTrigger}`;
        const clientsCacheKey = `clinician:${clinicianId}:clients`;
        
        // Check if we have cached data
        const cachedAppointments = externalAppointments.length === 0 ?
          appointmentsCache.get(appointmentsCacheKey) : null;
        const cachedClients = clientsCache.get(clientsCacheKey);
        
        // Fetch clinician data for availability
        const fetchedClinicianData = await fetchClinicianData(clinicianId);
        setClinicianData(fetchedClinicianData);
        
        // Prepare fetch promises based on cache status
        const fetchPromises = [];
        let appointmentData;
        let clientData;
        
        // 1. Appointments fetch (if needed)
        if (externalAppointments.length === 0 && !cachedAppointments) {
          fetchPromises.push(
            supabase
              .from('appointments')
              .select('*')
              .eq('clinician_id', clinicianId)
              .gte('start_at', utcStart)
              .lt('end_at', utcEnd)
              .order('start_at', { ascending: true })
              .then(result => {
                appointmentData = result;
                return result;
              })
          );
        } else {
          fetchPromises.push(Promise.resolve({ data: [], error: null }));
        }
        
        // 2. Clients fetch (if needed)
        if (!cachedClients) {
          fetchPromises.push(
            supabase
              .from('clients')
              .select('id, client_first_name, client_last_name, client_preferred_name')
              .eq('client_assigned_therapist', clinicianId.toString())
              .then(result => {
                clientData = result;
                return result;
              })
          );
        } else {
          fetchPromises.push(Promise.resolve({ data: [], error: null }));
        }
        
        // Execute all fetch promises in parallel
        const results = await Promise.all(fetchPromises);
        
        // Process appointments
        if (externalAppointments.length > 0) {
          // Use external appointments if provided
          setAppointments(externalAppointments);
        } else if (cachedAppointments) {
          // Use cached appointments
          setAppointments(cachedAppointments);
        } else if (appointmentData?.data) {
          // Use fetched appointments
          appointmentsCache.set(appointmentsCacheKey, appointmentData.data);
          setAppointments(appointmentData.data);
        } else {
          // Default to empty array
          setAppointments([]);
        }
        
        // Process clients
        const clientMap = new Map<string, Client>();
        
        if (cachedClients) {
          // Use cached clients
          cachedClients.forEach(client => {
            clientMap.set(client.id, client);
          });
        } else if (clientData?.data) {
          // Use fetched clients
          (clientData.data || []).forEach(client => {
            clientMap.set(client.id, client);
          });
          
          // Cache the client data
          clientsCache.set(clientsCacheKey, clientData.data);
        }
        
        setClients(clientMap);
        
        // Log fetch performance
        const fetchDuration = performance.now() - fetchStartTime;
        CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'data-fetch-complete', fetchDuration, {
          appointmentsCount: appointments.length,
          clientsCount: clientMap.size,
          hasClinicianData: !!fetchedClinicianData
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error fetching calendar data', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicianId, dateRange.start, dateRange.end, refreshTrigger, externalAppointments, fetchClinicianData]);

  return {
    loading,
    appointments,
    clients,
    clinicianData,
    error
  };
};

export default useCalendarDataFetching;
