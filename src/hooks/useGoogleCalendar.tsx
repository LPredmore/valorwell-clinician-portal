
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
              if (!tokenInfo.scope?.includes('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events')) {
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
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
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

  // Update a Google Calendar event
  const updateGoogleCalendarEvent = async (eventId: string, appointment: Appointment): Promise<string | null> => {
    if (!isConnected || !accessToken) {
      toast.error("Not connected to Google Calendar");
      return null;
    }
    setIsSyncing(true);
    try {
      const event: GoogleCalendarEvent = {
        summary: `Session with ${appointment.clientName || 'Client'}`,
        description: appointment.notes || `Appointment type: ${appointment.type}`,
        start: {
          dateTime: appointment.start_at,
          timeZone: 'UTC',
        },
        end: {
          dateTime: appointment.end_at,
          timeZone: 'UTC',
        },
      };

      // PATCH to Google API
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404) {
          // fallback to create if missing
          return await createGoogleCalendarEvent(appointment);
        }
        throw new Error(data.error?.message || 'Failed to update Google Calendar event');
      }
      toast.success("Appointment updated in Google Calendar");
      return data.id;
    } catch (err) {
      toast.error("Failed to update Google Calendar event");
      console.error(err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // Batch sync multiple appointments with upsert logic
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
      
      // Log all appointments being synced with detailed information
      console.log(`Syncing ${appointments.length} appointments to Google...`, appointments);
      
      if (appointments.length > 0) {
        // Log details about appointment date ranges for debugging
        const appointmentDates = appointments.map(a => ({
          id: a.id,
          date: DateTime.fromISO(a.start_at).toFormat('yyyy-MM-dd'),
          time: DateTime.fromISO(a.start_at).toFormat('HH:mm'),
          clientName: a.clientName || 'Unknown client',
          status: a.status,
          googleEventId: a.google_calendar_event_id || 'Not synced',
          lastSynced: a.last_synced_at || 'Never'
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
        
        // Log status distribution
        const statusCounts = appointments.reduce((acc, appt) => {
          acc[appt.status] = (acc[appt.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('Status distribution:', statusCounts);
      }
      
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const appointment of appointments) {
        console.log(`Processing appointment ${appointment.id} for ${appointment.clientName} at ${DateTime.fromISO(appointment.start_at).toFormat('yyyy-MM-dd HH:mm')}`);
        
        let eventId: string | null = null;
        try {
          if (appointment.google_calendar_event_id) {
            eventId = await updateGoogleCalendarEvent(appointment.google_calendar_event_id, appointment);
            if (eventId) updatedCount++;
          } else {
            eventId = await createGoogleCalendarEvent(appointment);
            if (eventId) createdCount++;
          }
          results.set(appointment.id, eventId);

          if (eventId) {
            await supabase
              .from('appointments')
              .update({
                google_calendar_event_id: eventId,
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', appointment.id);
          }
        } catch (err) {
          console.error(`Error syncing appointment ${appointment.id}:`, err);
          errorCount++;
          results.set(appointment.id, null);
        }
      }
      
      // Update clinician's last_google_sync timestamp
      if (appointments.length > 0 && appointments[0].clinician_id) {
        const { error: clinicianUpdateError } = await supabase
          .from('clinicians')
          .update({ last_google_sync: new Date().toISOString() })
          .eq('id', appointments[0].clinician_id);
          
        if (clinicianUpdateError) {
          console.error('Error updating clinician last_google_sync:', clinicianUpdateError);
        } else {
          console.log('Updated clinician last_google_sync timestamp');
        }
      }
      
      const successCount = Array.from(results.values()).filter(Boolean).length;
      console.log(`Sync complete: ${successCount} of ${appointments.length} appointments successfully synced (${createdCount} created, ${updatedCount} updated, ${errorCount} errors)`);
      console.groupEnd();
      
      if (appointments.length > 0) {
        toast.success(`Synced ${successCount} appointments to Google Calendar (${createdCount} created, ${updatedCount} updated)`);
      } else {
        toast.info("No appointments found to sync with Google Calendar");
      }
      
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
    updateGoogleCalendarEvent,
    syncMultipleAppointments
  };
};
