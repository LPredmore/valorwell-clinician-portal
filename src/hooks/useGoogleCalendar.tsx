
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Appointment } from '@/types/appointment';

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

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const hasToken = !!session?.provider_token;
        setIsConnected(hasToken);
        if (hasToken && session?.provider_token) {
          setAccessToken(session.provider_token);
        }
      } catch (err) {
        console.error('Error checking Google Calendar connection:', err);
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

      // Call the Google Calendar API
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create Google Calendar event');
      }

      const data = await response.json();
      toast.success("Appointment synced to Google Calendar");
      return data.id; // Return the Google Calendar event ID
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
      for (const appointment of appointments) {
        const eventId = await createGoogleCalendarEvent(appointment);
        results.set(appointment.id, eventId);
      }
      
      toast.success(`Synced ${results.size} appointments to Google Calendar`);
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
