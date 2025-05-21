import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, UserCircle } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import { TimeZoneService } from '@/utils/timeZoneService';

interface PastAppointment {
  id: string | number;
  formattedDate: string;
  formattedTime: string;
  type: string;
  therapist: string;
  status?: string;
  start_at: string;
  end_at: string;
}

interface MyAppointmentsProps {
  pastAppointments?: PastAppointment[];
}

const ErrorBoundaryFallback = ({ error }: { error: Error }) => (
  <div className="p-4 border border-red-200 rounded bg-red-50 text-red-700">
    <h3 className="font-medium">Something went wrong loading appointments</h3>
    <p className="text-sm mt-2">Please try again later or contact support if the issue persists.</p>
    <details className="mt-2 text-xs">
      <summary>Technical Details</summary>
      <pre className="mt-1 p-2 bg-white rounded overflow-x-auto">{error.message}</pre>
    </details>
  </div>
);

/**
 * Ensures consistent timezone handling across the application
 * @param timezoneFromDB The timezone from the database (could be array or string)
 * @returns A valid IANA timezone string
 */
const resolveTimezone = (timezoneFromDB: string | string[] | null): string => {
  try {
    // Check if it's an array and has values
    if (Array.isArray(timezoneFromDB) && timezoneFromDB.length > 0) {
      return TimeZoneService.ensureIANATimeZone(timezoneFromDB[0]);
    }
    
    // Check if it's a string
    if (typeof timezoneFromDB === 'string' && timezoneFromDB) {
      return TimeZoneService.ensureIANATimeZone(timezoneFromDB);
    }
    
    // Default to browser timezone if neither are valid
    console.log('[resolveTimezone] No valid timezone found, using browser timezone');
    return TimeZoneService.ensureIANATimeZone(getUserTimeZone());
  } catch (error) {
    console.error('[resolveTimezone] Error resolving timezone:', error);
    return TimeZoneService.DEFAULT_TIMEZONE;
  }
};

/**
 * MyAppointments component displays a list of past appointments for a client
 */
const MyAppointments: React.FC<MyAppointmentsProps> = ({ pastAppointments: initialPastAppointments }) => {
  // Static states
  const [loading, setLoading] = useState(false);
  const [pastAppointments, setPastAppointments] = useState<PastAppointment[]>([]);
  const [clinicianName, setClinicianName] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  // Lifecycle state variables
  const isMounted = useRef(true);
  const fetchAttempts = useRef(0);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 2000; // 2 seconds between fetches
  const MAX_FETCH_ATTEMPTS = 3; // Maximum number of fetch attempts
  
  // Tracking states to prevent infinite loops
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasLoadedClientData, setHasLoadedClientData] = useState(false);
  const [hasLoadedAppointments, setHasLoadedAppointments] = useState(false);
  
  // Client timezone with default
  const [clientTimeZone, setClientTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);

  // Reset component mount status on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Define safe state update functions
  const safeSetState = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    if (isMounted.current) {
      setter(value);
    }
  }, []);
  
  // Load client data once
  useEffect(() => {
    if (hasInitialized) return;
    setHasInitialized(true);
    
    const fetchClientData = async () => {
      if (loading || hasLoadedClientData) return;
      
      try {
        const now = Date.now();
        if (now - lastFetchTime.current < FETCH_COOLDOWN) {
          console.log("Throttling client data fetch - too soon since last fetch");
          return;
        }
        
        lastFetchTime.current = now;
        fetchAttempts.current++;
        
        if (fetchAttempts.current > MAX_FETCH_ATTEMPTS) {
          console.warn("Maximum fetch attempts reached for client data");
          return;
        }
        
        safeSetState(setLoading, true);
        
        // Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('Error getting current user:', userError);
          safeSetState(setLoading, false);
          return;
        }
        
        // Get client data for the authenticated user
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (clientError) {
          console.error('Error getting client data:', clientError);
          safeSetState(setLoading, false);
          return;
        }
        
        if (!client) {
          console.warn('No client data found for user:', user.id);
          safeSetState(setLoading, false);
          return;
        }
        
        console.log('Client data retrieved:', client);
        safeSetState(setClientData, client);
        
        // Get timezone from client data or default to browser
        if (client?.client_time_zone) {
          const resolvedTimezone = resolveTimezone(client.client_time_zone);
          console.log(`Setting client timezone from database: ${client.client_time_zone} → ${resolvedTimezone}`);
          safeSetState(setClientTimeZone, resolvedTimezone);
        } else {
          const browserTimezone = getUserTimeZone();
          console.log(`No client timezone found, using browser timezone: ${browserTimezone}`);
          safeSetState(setClientTimeZone, TimeZoneService.ensureIANATimeZone(browserTimezone));
        }
        
        // Fetch clinician name if assigned
        if (client?.client_assigned_therapist) {
          const { data: clinician, error: clinicianError } = await supabase
            .from('clinicians')
            .select('clinician_professional_name')
            .eq('id', client.client_assigned_therapist)
            .single();
            
          if (!clinicianError && clinician) {
            safeSetState(setClinicianName, clinician?.clinician_professional_name || null);
          }
        }
        
        // Mark client data as loaded
        safeSetState(setHasLoadedClientData, true);
      } catch (error) {
        console.error('Error fetching client data:', error);
        safeSetState(setError, error instanceof Error ? error : new Error('Failed to fetch client data'));
      } finally {
        safeSetState(setLoading, false);
      }
    };
    
    fetchClientData();
  }, [hasInitialized, loading, hasLoadedClientData, safeSetState]);

  // Load appointments once client data is available
  useEffect(() => {
    // Only proceed if we have client data and haven't loaded appointments yet
    if (!clientData?.id || !hasLoadedClientData || loading || hasLoadedAppointments) {
      return;
    }
    
    const fetchPastAppointments = async () => {
      try {
        const now = Date.now();
        if (now - lastFetchTime.current < FETCH_COOLDOWN) {
          console.log("Throttling appointments fetch - too soon since last fetch");
          return;
        }
        
        lastFetchTime.current = now;
        fetchAttempts.current++;
        
        if (fetchAttempts.current > MAX_FETCH_ATTEMPTS) {
          console.warn("Maximum fetch attempts reached for appointments");
          return;
        }
        
        safeSetState(setLoading, true);
        console.log(`Fetching past appointments for client ${clientData.id} with timezone ${clientTimeZone}`);
        
        // Get the current time in UTC
        const nowUTC = TimeZoneService.now().toUTC().toISO();
        
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('client_id', clientData.id)
          .lt('end_at', nowUTC)  // Use end_at to find completed appointments
          .neq('status', 'cancelled')
          .order('start_at', { ascending: false })
          .limit(20); // Add limit to prevent potential performance issues

        if (error) {
          console.error('Error fetching past appointments:', error);
          safeSetState(setLoading, false);
          safeSetState(setError, new Error(`Failed to fetch past appointments: ${error.message}`));
          return;
        }

        // Flag that we've loaded appointments to prevent reloading
        safeSetState(setHasLoadedAppointments, true);

        if (data && data.length > 0) {
          console.log("Past appointments data fetched successfully:", data.length, "appointments");
          
          const formattedAppointments = data.map(appointment => {
            try {
              // Format using TimeZoneService for consistency
              const startDateTime = TimeZoneService.fromUTC(appointment.start_at, clientTimeZone);
              
              return {
                id: appointment.id,
                formattedDate: startDateTime.toFormat('MMMM d, yyyy'),
                formattedTime: startDateTime.toFormat('h:mm a'),
                type: appointment.type || 'Appointment',
                therapist: clinicianName || 'Your Therapist',
                status: appointment.status,
                start_at: appointment.start_at,
                end_at: appointment.end_at
              };
            } catch (error) {
              console.error('Error processing appointment:', error, appointment);
              return {
                id: appointment.id || 'unknown-id',
                formattedDate: 'Date unavailable',
                formattedTime: 'Time unavailable',
                type: appointment.type || 'Appointment',
                therapist: clinicianName || 'Your Therapist',
                start_at: appointment.start_at || '',
                end_at: appointment.end_at || ''
              };
            }
          });
          
          safeSetState(setPastAppointments, formattedAppointments);
        } else {
          console.log("No past appointments found");
          safeSetState(setPastAppointments, []);
        }
      } catch (error) {
        console.error('Error in fetchPastAppointments:', error);
        safeSetState(setError, error instanceof Error ? error : new Error('Failed to fetch past appointments'));
      } finally {
        safeSetState(setLoading, false);
      }
    };
    
    fetchPastAppointments();
  }, [clientData, hasLoadedClientData, loading, hasLoadedAppointments, clientTimeZone, clinicianName, safeSetState]);

  // Safely get timezone display with error handling
  const timeZoneDisplay = TimeZoneService.getTimeZoneDisplayName(clientTimeZone);

  // If there's an error, show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Past Appointments</CardTitle>
          <CardDescription>View your appointment history</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorBoundaryFallback error={error} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Past Appointments</CardTitle>
        <CardDescription>View your appointment history</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !hasLoadedAppointments ? (
          <div className="py-6 text-center">Loading past appointments...</div>
        ) : pastAppointments.length > 0 ? (
          <div>
            <p className="text-sm text-gray-500 mb-2">All times shown in {timeZoneDisplay}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Therapist</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.formattedDate}</TableCell>
                    <TableCell>{appointment.formattedTime}</TableCell>
                    <TableCell>{appointment.type}</TableCell>
                    <TableCell>{appointment.therapist}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium">No past appointments</h3>
            <p className="text-sm text-gray-500 mt-1">Your appointment history will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyAppointments;
