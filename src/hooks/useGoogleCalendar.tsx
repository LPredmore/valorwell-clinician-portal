
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';

// Interface for Google Calendar event creation
interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check connection status and token validity on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const hasToken = !!session?.provider_token;
        
        // Debug: Log token details
        if (hasToken && session?.provider_token) {
          console.group('Google Calendar Token Validation');
          console.log('Token exists, checking validity...');
          
          // Simple token validation by checking expiration
          if (session.expires_at && session.expires_at * 1000 < Date.now()) {
            console.warn('Token expired at:', new Date(session.expires_at * 1000));
            setIsConnected(false);
            setAccessToken(null);
          } else {
            // Validate token with Google's token info endpoint
            console.log('Validating token with Google...');
            const tokenInfoResponse = await fetch(
              `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${session.provider_token}`
            );
            
            if (!tokenInfoResponse.ok) {
              console.error('Token validation failed:', await tokenInfoResponse.json());
              setIsConnected(false);
              setAccessToken(null);
            } else {
              const tokenInfo = await tokenInfoResponse.json();
              console.log('Token info:', tokenInfo);
              
              // Verify required scopes
              if (!tokenInfo.scope?.includes('https://www.googleapis.com/auth/calendar')) {
                console.error('Missing required calendar scope');
                setIsConnected(false);
                setAccessToken(null);
              } else {
                console.log('Token is valid with required scopes');
                setIsConnected(true);
                setAccessToken(session.provider_token);
              }
            }
          }
          
          console.groupEnd();
        } else {
          setIsConnected(false);
          setAccessToken(null);
        }
      } catch (err) {
        console.error('Error checking Google Calendar connection:', err);
        setIsConnected(false);
        setAccessToken(null);
      }
    };
    checkConnection();
  }, []);

  const connectGoogleCalendar = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Start Google OAuth flow
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (authError) throw authError;

      // The actual token will be available after redirect in the session
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Google Calendar');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setIsConnected(false);
      setAccessToken(null);
      toast.success("Google Calendar disconnected successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Google Calendar');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a Google Calendar event
  const createGoogleCalendarEvent = async (appointment: Appointment): Promise<string | null> => {
    if (!isConnected || !accessToken) {
      toast.error("Not connected to Google Calendar");
      return null;
    }

    setIsSyncing(true);
    try {
      // Format the appointment as a Google Calendar event
      const event: GoogleCalendarEvent = {
        summary: `Session with ${appointment.clientName || 'Client'}`,
        description: appointment.notes || `Appointment type: ${appointment.type}`,
        start: {
          dateTime: appointment.start_at,
          timeZone: 'UTC', // We store appointments in UTC
        },
        end: {
          dateTime: appointment.end_at,
          timeZone: 'UTC',
        },
      };

      // Debug: Log the request payload
      console.groupCollapsed('Google Calendar API Request');
      console.log('Endpoint:', 'https://www.googleapis.com/calendar/v3/calendars/primary/events');
      console.log('Headers:', {
        'Authorization': `Bearer ${accessToken?.substring(0, 10)}...`,
        'Content-Type': 'application/json'
      });
      console.log('Payload:', event);
      console.groupEnd();

      // Call the Google Calendar API
      let response;
      try {
        response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        // Debug: Log the response
        console.groupCollapsed('Google Calendar API Response');
        console.log('Status:', response.status, response.statusText);
        
        const responseData = await response.json();
        if (!response.ok) {
          console.error('Error:', responseData);
          console.groupEnd();
          
          // Handle specific Google API errors
          if (response.status === 401) {
            throw new Error('Google Calendar access token expired or revoked');
          } else if (response.status === 403) {
            throw new Error('Insufficient permissions for Google Calendar');
          } else {
            throw new Error(responseData.error?.message || 'Failed to create Google Calendar event');
          }
        }

        console.log('Success:', responseData);
        console.groupEnd();
        
        // Fix: Use the locally scoped responseData instead of undefined 'data'
        toast.success("Appointment synced to Google Calendar");
        return responseData.id; // Return the Google Calendar event ID
      } catch (err) {
        console.error('Network error during Google Calendar API call:', err);
        throw new Error('Network error while connecting to Google Calendar');
      }
    } catch (err) {
      console.error('Error creating Google Calendar event:', err);
      setError(err instanceof Error ? err.message : 'Failed to create Google Calendar event');
      toast.error("Failed to sync with Google Calendar");
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // Batch sync multiple appointments
  const syncMultipleAppointments = async (appointments: Appointment[]): Promise<Map<string, string | null>> => {
    if (!isConnected || !accessToken) {
      toast.error("Not connected to Google Calendar");
      return new Map();
    }

    setIsSyncing(true);
    const results = new Map<string, string | null>();
    
    try {
      // Enhanced logging for sync operation
      console.group('Google Calendar Sync Operation');
      console.log(`Attempting to sync ${appointments.length} appointments`);
      
      // Add the requested debug log
      console.log(`Syncing ${appointments.length} appointments to Google...`, appointments);
      
      if (appointments.length > 0) {
        // Log details about appointment date ranges for debugging
        const appointmentDates = appointments.map(a => ({
          id: a.id,
          date: DateTime.fromISO(a.start_at).toFormat('yyyy-MM-dd'),
          time: DateTime.fromISO(a.start_at).toFormat('HH:mm'),
          clientName: a.clientName || 'Unknown client'
        }));
        
        console.log('Appointments being synced:', appointmentDates);
        
        // Calculate the date range of appointments being synced
        const startDates = appointments.map(a => DateTime.fromISO(a.start_at));
        const earliestDate = startDates.length > 0 ? 
          startDates.reduce((earliest, current) => current < earliest ? current : earliest, startDates[0])
          : 'No appointments';
        const latestDate = startDates.length > 0 ?
          startDates.reduce((latest, current) => current > latest ? current : latest, startDates[0])
          : 'No appointments';
          
        console.log('Date range of sync:', {
          earliest: earliestDate instanceof DateTime ? earliestDate.toFormat('yyyy-MM-dd') : earliestDate,
          latest: latestDate instanceof DateTime ? latestDate.toFormat('yyyy-MM-dd') : latestDate,
        });
      }
      
      for (const appointment of appointments) {
        console.log(`Syncing appointment ${appointment.id} for ${appointment.clientName} at ${DateTime.fromISO(appointment.start_at).toFormat('yyyy-MM-dd HH:mm')}`);
        const eventId = await createGoogleCalendarEvent(appointment);
        results.set(appointment.id, eventId);
        console.log(`Result for appointment ${appointment.id}: ${eventId ? 'Success' : 'Failed'}`);
      }
      
      const successCount = Array.from(results.values()).filter(Boolean).length;
      console.log(`Sync complete: ${successCount} of ${appointments.length} appointments successfully synced`);
      console.groupEnd();
      
      toast.success(`Synced ${successCount} appointments to Google Calendar`);
      return results;
    } catch (err) {
      console.error('Error syncing multiple appointments:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync appointments');
      toast.error("Failed to sync appointments with Google Calendar");
      return results;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isConnected,
    isLoading,
    isSyncing,
    error,
    accessToken,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    createGoogleCalendarEvent,
    syncMultipleAppointments
  };
};
