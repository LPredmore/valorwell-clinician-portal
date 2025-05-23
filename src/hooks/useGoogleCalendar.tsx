import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/appointment';
import { SyncedEvent } from '@/types/syncedEvent';
import { useToast } from '@/hooks/use-toast';
import { toast as toastNotification } from '@/components/ui/use-toast';

// Type for Google Calendar event
interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    date?: string;
    timeZone?: string;
  };
  updated?: string;
  transparency?: string; // 'transparent' for free, undefined or 'opaque' for busy
}

// Type for sync result
interface SyncResult {
  created: number;
  updated: number;
  errors: number;
}

// Type for sync direction
type SyncDirection = 'toGoogle' | 'fromGoogle' | 'both';

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncDirection, setSyncDirection] = useState<SyncDirection>('both');
  const toast = useToast();

  // Check if Google Calendar is connected
  const checkConnection = useCallback(async () => {
    try {
      console.log('[useGoogleCalendar] Checking Google Calendar connection...');
      
      // Check if we have a token in localStorage
      const token = localStorage.getItem('googleCalendarToken');
      if (!token) {
        console.log('[useGoogleCalendar] No token found');
        setIsConnected(false);
        return false;
      }
      
      // Validate token
      console.log('Google Calendar Token Validation');
      console.log('Token exists, checking validity...');
      
      // Call Google's tokeninfo endpoint to validate the token
      console.log('Validating token with Google...');
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      
      if (!response.ok) {
        console.log('Token is invalid or expired');
        localStorage.removeItem('googleCalendarToken');
        setIsConnected(false);
        return false;
      }
      
      const tokenInfo = await response.json();
      console.log('Token info:', tokenInfo);
      
      // Check if token has the required scopes
      const hasCalendarScope = tokenInfo.scope.includes('https://www.googleapis.com/auth/calendar');
      
      if (hasCalendarScope) {
        console.log('Token is valid with required scopes');
        setIsConnected(true);
        return true;
      } else {
        console.log('Token is valid but missing required scopes');
        setIsConnected(false);
        return false;
      }
    } catch (err) {
      console.error('Error checking Google Calendar connection:', err);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Connect to Google Calendar
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Generate a random state value for security
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('googleOAuthState', state);
      
      // Calculate redirect URI
      const redirectUri = `${window.location.origin}/auth/google-callback`;
      
      // Google OAuth2 authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      
      // Add query parameters
      authUrl.searchParams.append('client_id', '812956782457-lmtq86avjefqi23qp1596tqat5aa6v4c.apps.googleusercontent.com');
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'token');
      authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile openid');
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('prompt', 'consent');
      authUrl.searchParams.append('access_type', 'online');
      
      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
      
      return true;
    } catch (err) {
      console.error('Error connecting to Google Calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Calendar');
      setIsConnecting(false);
      return false;
    }
  }, []);

  // Disconnect from Google Calendar
  const disconnect = useCallback(() => {
    try {
      localStorage.removeItem('googleCalendarToken');
      setIsConnected(false);
      toastNotification({
        title: "Success",
        description: "Disconnected from Google Calendar"
      });
      return true;
    } catch (err) {
      console.error('Error disconnecting from Google Calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect from Google Calendar');
      return false;
    }
  }, [toast]);

  // Fetch events from Google Calendar
  const fetchEventsFromGoogleCalendar = async (
    startTime: Date | string,
    endTime: Date | string
  ): Promise<GoogleCalendarEvent[]> => {
    try {
      const token = localStorage.getItem('googleCalendarToken');
      if (!token) {
        throw new Error('Not connected to Google Calendar');
      }
      
      // Format dates for API request
      const timeMin = typeof startTime === 'string' ? startTime : startTime.toISOString();
      const timeMax = typeof endTime === 'string' ? endTime : endTime.toISOString();
      
      console.log('Fetching Google Calendar Events');
      console.log(`Fetching events from ${new Date(timeMin).toLocaleString()} to ${new Date(timeMax).toLocaleString()}`);
      
      // Build API request URL
      const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=2500`;
      
      console.log('API Request URL:', apiUrl);
      
      // Fetch events from Google Calendar API
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Calendar API error:', errorData);
        throw new Error(`Google Calendar API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      const events = data.items || [];
      
      console.log(`Fetched ${events.length} events from Google Calendar`);
      console.log('Sample events:', events.slice(0, 3));
      
      return events;
    } catch (err) {
      console.error('Error fetching events from Google Calendar:', err);
      throw err;
    }
  };

  // Sync a single appointment to Google Calendar
  const syncAppointmentToGoogle = async (appointment: Appointment): Promise<string | null> => {
    try {
      const token = localStorage.getItem('googleCalendarToken');
      if (!token) {
        throw new Error('Not connected to Google Calendar');
      }
      
      // Check if appointment already has a Google Calendar event ID
      if (appointment.google_calendar_event_id) {
        // Update existing event
        console.log(`Updating Google Calendar event for appointment ${appointment.id}`);
        
        // Build event data
        const eventData = {
          summary: `Session with ${appointment.clientName || 'Client'}`,
          description: appointment.notes || '',
          start: {
            dateTime: appointment.start_at,
            timeZone: 'UTC'
          },
          end: {
            dateTime: appointment.end_at,
            timeZone: 'UTC'
          }
        };
        
        // Update event in Google Calendar
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_calendar_event_id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error updating Google Calendar event:', errorData);
          return null;
        }
        
        const data = await response.json();
        
        // Update appointment with latest sync time
        await supabase
          .from('appointments')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', appointment.id);
          
        return data.id;
      } else {
        // Create new event
        console.log(`Creating Google Calendar event for appointment ${appointment.id}`);
        
        // Build event data
        const eventData = {
          summary: `Session with ${appointment.clientName || 'Client'}`,
          description: appointment.notes || '',
          start: {
            dateTime: appointment.start_at,
            timeZone: 'UTC'
          },
          end: {
            dateTime: appointment.end_at,
            timeZone: 'UTC'
          }
        };
        
        // Create event in Google Calendar
        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error creating Google Calendar event:', errorData);
          return null;
        }
        
        const data = await response.json();
        
        // Update appointment with Google Calendar event ID and sync time
        await supabase
          .from('appointments')
          .update({
            google_calendar_event_id: data.id,
            last_synced_at: new Date().toISOString()
          })
          .eq('id', appointment.id);
          
        return data.id;
      }
    } catch (err) {
      console.error(`Error syncing appointment ${appointment.id} to Google Calendar:`, err);
      return null;
    }
  };

  // Sync multiple appointments to Google Calendar
  const syncMultipleAppointments = async (appointments: Appointment[]): Promise<Map<string, string | null>> => {
    try {
      console.log('Google Calendar Sync Operation');
      console.log(`Attempting to sync ${appointments.length} appointments`);
      
      // Filter appointments to only include those that need syncing
      const appointmentsToSync = appointments.filter(appointment => {
        // Only sync scheduled appointments
        return appointment.status === 'scheduled';
      });
      
      console.log(`Syncing ${appointmentsToSync.length} appointments to Google...`, appointmentsToSync);
      
      // Track results
      const results = new Map<string, string | null>();
      let successCount = 0;
      let createCount = 0;
      let updateCount = 0;
      let errorCount = 0;
      
      // Sync each appointment
      for (const appointment of appointmentsToSync) {
        const eventId = await syncAppointmentToGoogle(appointment);
        results.set(appointment.id, eventId);
        
        if (eventId) {
          successCount++;
          if (appointment.google_calendar_event_id) {
            updateCount++;
          } else {
            createCount++;
          }
        } else {
          errorCount++;
        }
      }
      
      console.log(`Sync complete: ${successCount} of ${appointmentsToSync.length} appointments successfully synced (${createCount} created, ${updateCount} updated, ${errorCount} errors)`);
      
      return results;
    } catch (err) {
      console.error('Error syncing appointments to Google Calendar:', err);
      throw err;
    }
  };

  // NEW: Convert Google Calendar event to synced event object
  const convertGoogleEventToSyncedEvent = (
    googleEvent: GoogleCalendarEvent,
    clinicianId: string
  ): Partial<SyncedEvent> => {
    return {
      clinician_id: clinicianId,
      google_calendar_event_id: googleEvent.id,
      start_at: googleEvent.start.dateTime || `${googleEvent.start.date}T00:00:00Z`,
      end_at: googleEvent.end.dateTime || `${googleEvent.end.date}T23:59:59Z`,
      original_title: googleEvent.summary || '',
      original_description: googleEvent.description || '',
      display_title: 'Personal Block',
      is_busy: googleEvent.transparency !== 'transparent'
    };
  };

  // NEW: Import events from Google Calendar to our database
  const importEventsFromGoogle = async (
    clinicianId: string,
    startTime: Date | string,
    endTime: Date | string,
    existingAppointments: Appointment[]
  ): Promise<SyncResult> => {
    setIsSyncing(true);
    
    try {
      console.group('Importing Google Calendar Events');
      console.log('Fetching events for clinician:', clinicianId);
      
      // Fetch events from Google Calendar
      const googleEvents = await fetchEventsFromGoogleCalendar(startTime, endTime);
      
      if (googleEvents.length === 0) {
        console.log('No events found in Google Calendar');
        console.groupEnd();
        return { created: 0, updated: 0, errors: 0 };
      }
      
      console.log(`Processing ${googleEvents.length} Google Calendar events`);
      
      // Prepare result counters
      let created = 0;
      let updated = 0;
      let errors = 0;
      
      // Create a map of existing appointments by Google Calendar event ID
      const appointmentsByGoogleId = new Map<string, Appointment>();
      existingAppointments.forEach(appointment => {
        if (appointment.google_calendar_event_id) {
          appointmentsByGoogleId.set(appointment.google_calendar_event_id, appointment);
        }
      });
      
      console.log(`Found ${appointmentsByGoogleId.size} existing appointments with Google Calendar IDs`);
      
      // Filter to only include events marked as "busy" (not "transparent")
      const busyEvents = googleEvents.filter(event => event.transparency !== 'transparent');
      console.log(`Found ${busyEvents.length} busy events`);
      
      // Prepare events for batch insert/update
      const syncedEvents = busyEvents.map(event => 
        convertGoogleEventToSyncedEvent(event, clinicianId)
      );
      
      // Check if synced_events table exists
      const { error: tableCheckError } = await supabase
        .from('synced_events')
        .select('id')
        .limit(1)
        .single();
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        // Table doesn't exist, fall back to old method but remove clientName
        console.warn('synced_events table does not exist, falling back to old method');
        
        // Process each Google Calendar event
        for (const googleEvent of busyEvents) {
          if (!googleEvent.id) {
            console.warn('Skipping Google event without ID:', googleEvent);
            continue;
          }
          
          try {
            const existingAppointment = appointmentsByGoogleId.get(googleEvent.id);
            
            if (existingAppointment) {
              // Update existing appointment if it's changed
              console.log(`Found existing appointment for Google event ${googleEvent.id}`);
              
              // Check if Google event is newer than our last sync
              const lastSyncTime = existingAppointment.last_synced_at 
                ? new Date(existingAppointment.last_synced_at).getTime()
                : 0;
                
              const googleUpdateTime = googleEvent.updated 
                ? new Date(googleEvent.updated).getTime() 
                : Infinity; // If no update time, assume it's newer
              
              if (googleUpdateTime > lastSyncTime) {
                console.log(`Google event ${googleEvent.id} was updated after last sync, updating local appointment`);
                
                // Update appointment with Google data
                const { data, error } = await supabase
                  .from('appointments')
                  .update({
                    start_at: googleEvent.start.dateTime,
                    end_at: googleEvent.end.dateTime,
                    notes: googleEvent.description || existingAppointment.notes,
                    last_synced_at: new Date().toISOString()
                  })
                  .eq('id', existingAppointment.id)
                  .select();
                  
                if (error) {
                  console.error(`Error updating appointment ${existingAppointment.id}:`, error);
                  errors++;
                } else {
                  console.log(`Updated appointment ${existingAppointment.id} with Google data`);
                  updated++;
                }
              } else {
                console.log(`Google event ${googleEvent.id} has not changed since last sync, skipping`);
              }
            } else {
              // Skip creating new appointments from Google events
              // This avoids the clientName error
              console.log(`No existing appointment for Google event ${googleEvent.id}, skipping creation`);
            }
          } catch (err) {
            console.error(`Error processing Google event ${googleEvent.id}:`, err);
            errors++;
          }
        }
      } else {
        // synced_events table exists, use it
        console.log('Using synced_events table for Google Calendar sync');
        
        // Batch upsert to synced_events table
        const { error, count } = await supabase
          .from('synced_events')
          .upsert(syncedEvents, { 
            onConflict: 'google_calendar_event_id',
            ignoreDuplicates: false
          })
          .select('count');
          
        if (error) {
          console.error('Error upserting synced events:', error);
          errors += syncedEvents.length;
        } else {
          console.log(`Successfully synced ${count} events`);
          created = count || syncedEvents.length;
        }
      }
      
      // Update clinician's last_google_sync timestamp
      const { error: clinicianUpdateError } = await supabase
        .from('clinicians')
        .update({ last_google_sync: new Date().toISOString() })
        .eq('id', clinicianId);
        
      if (clinicianUpdateError) {
        console.error('Error updating clinician last_google_sync:', clinicianUpdateError);
      } else {
        console.log('Updated clinician last_google_sync timestamp');
      }
      
      console.log(`Import complete: ${created} created, ${updated} updated, ${errors} errors`);
      console.groupEnd();
      
      // Return results
      const result = { created, updated, errors };
      
      if (created > 0 || updated > 0) {
        toastNotification({
          title: "Success",
          description: `Imported ${created + updated} events from Google Calendar (${created} new, ${updated} updated)`
        });
      } else if (errors > 0) {
        toastNotification({
          title: "Error",
          description: `Failed to import events from Google Calendar (${errors} errors)`,
          variant: "destructive"
        });
      } else {
        toastNotification({
          title: "Info",
          description: "No new events found in Google Calendar"
        });
      }
      
      return result;
    } catch (err) {
      console.error('Error importing Google Calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to import events from Google Calendar');
      toastNotification({
        title: "Error",
        description: "Failed to import events from Google Calendar",
        variant: "destructive"
      });
      return { created: 0, updated: 0, errors: 1 };
    } finally {
      setIsSyncing(false);
    }
  };

  // NEW: Bidirectional sync function
  const bidirectionalSync = async (
    clinicianId: string,
    appointments: Appointment[],
    startTime: Date | string,
    endTime: Date | string
  ): Promise<{
    toGoogle: Map<string, string | null>;
    fromGoogle: SyncResult;
  }> => {
    setIsSyncing(true);
    
    try {
      console.group('Bidirectional Google Calendar Sync');
      console.log(`Starting bidirectional sync for clinician ${clinicianId}`);
      
      let toGoogleResult = new Map<string, string | null>();
      let fromGoogleResult = { created: 0, updated: 0, errors: 0 };
      
      // Sync direction control
      if (syncDirection === 'both' || syncDirection === 'toGoogle') {
        console.log('Syncing appointments to Google Calendar');
        toGoogleResult = await syncMultipleAppointments(appointments);
      }
      
      if (syncDirection === 'both' || syncDirection === 'fromGoogle') {
        console.log('Importing events from Google Calendar');
        fromGoogleResult = await importEventsFromGoogle(
          clinicianId,
          startTime,
          endTime,
          appointments
        );
      }
      
      console.log('Bidirectional sync complete', {
        toGoogle: {
          total: toGoogleResult.size,
          successful: Array.from(toGoogleResult.values()).filter(Boolean).length
        },
        fromGoogle: fromGoogleResult
      });
      
      console.groupEnd();
      
      // Update last sync time
      setLastSyncTime(new Date());
      
      return {
        toGoogle: toGoogleResult,
        fromGoogle: fromGoogleResult
      };
    } catch (err) {
      console.error('Error in bidirectional sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync with Google Calendar');
      toastNotification({
        title: "Error",
        description: "Failed to sync with Google Calendar",
        variant: "destructive"
      });
      return {
        toGoogle: new Map(),
        fromGoogle: { created: 0, updated: 0, errors: 1 }
      };
    } finally {
      setIsSyncing(false);
    }
  };

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = () => {
      // Check if we're on the callback page
      if (window.location.hash.includes('access_token=')) {
        // Parse hash parameters
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('access_token');
        const state = params.get('state');
        const storedState = localStorage.getItem('googleOAuthState');
        
        // Validate state to prevent CSRF
        if (state !== storedState) {
          console.error('OAuth state mismatch');
          toastNotification({
            title: "Error",
            description: "Authentication failed: Invalid state",
            variant: "destructive"
          });
          return;
        }
        
        // Store token
        if (accessToken) {
          localStorage.setItem('googleCalendarToken', accessToken);
          localStorage.removeItem('googleOAuthState');
          setIsConnected(true);
          toastNotification({
            title: "Success",
            description: "Connected to Google Calendar"
          });
          
          // Redirect back to the original page
          window.location.href = '/calendar';
        }
      }
    };
    
    handleOAuthCallback();
  }, [toast]);

  return {
    isConnected,
    isConnecting,
    isSyncing,
    error,
    lastSyncTime,
    syncDirection,
    connect,
    disconnect,
    checkConnection,
    syncAppointmentToGoogle,
    syncMultipleAppointments,
    importEventsFromGoogle,
    bidirectionalSync,
    setSyncDirection
  };
};
