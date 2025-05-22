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
  id?: string;
  status?: string;
  created?: string;
  updated?: string;
  htmlLink?: string;
}

// Interface for sync conflict resolution
interface SyncConflict {
  googleEvent: GoogleCalendarEvent;
  localAppointment?: Appointment;
  type: 'new' | 'updated' | 'deleted';
}

// Interface for sync results
interface SyncResult {
  created: number;
  updated: number;
  errors: number;
  conflicts?: SyncConflict[];
}

// Interface for a synced event from Google Calendar
export interface SyncedEvent {
  id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  google_calendar_event_id: string;
  original_title: string;
  original_description?: string;
  display_title: string;
  is_visible: boolean;
  last_synced_at: string;
}

// Keywords that might indicate a work appointment vs. personal event
const WORK_APPOINTMENT_KEYWORDS = [
  'session with',
  'client',
  'patient',
  'therapy',
  'appointment',
  'consultation',
  'meeting with',
  'clinical',
  'treatment'
];

export const useGoogleCalendar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncDirection, setSyncDirection] = useState<'both' | 'toGoogle' | 'fromGoogle'>('both');
  
  // New state for personal events settings
  const [personalEventsLabel, setPersonalEventsLabel] = useState<string>('Personal Block');
  const [showPersonalEvents, setShowPersonalEvents] = useState<boolean>(true);

  // Load user preferences from local storage on mount
  useEffect(() => {
    try {
      const savedLabel = localStorage.getItem('personalEventsLabel');
      if (savedLabel) setPersonalEventsLabel(savedLabel);
      
      const savedShowEvents = localStorage.getItem('showPersonalEvents');
      if (savedShowEvents !== null) {
        setShowPersonalEvents(savedShowEvents === 'true');
      }
      
      const savedSyncDirection = localStorage.getItem('syncDirection') as 'both' | 'toGoogle' | 'fromGoogle';
      if (savedSyncDirection) setSyncDirection(savedSyncDirection);
    } catch (err) {
      console.error('Error loading Google Calendar preferences:', err);
    }
  }, []);

  // Save preferences to local storage when they change
  useEffect(() => {
    try {
      localStorage.setItem('personalEventsLabel', personalEventsLabel);
      localStorage.setItem('showPersonalEvents', String(showPersonalEvents));
      localStorage.setItem('syncDirection', syncDirection);
    } catch (err) {
      console.error('Error saving Google Calendar preferences:', err);
    }
  }, [personalEventsLabel, showPersonalEvents, syncDirection]);

  // Check connection status and token validity on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log("[useGoogleCalendar] Checking Google Calendar connection...");
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
            try {
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
                if (!tokenInfo.scope?.includes("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events")) {
                  console.error('Missing required calendar scope');
                  setIsConnected(false);
                  setAccessToken(null);
                } else {
                  console.log('Token is valid with required scopes');
                  setIsConnected(true);
                  setAccessToken(session.provider_token);
                }
              }
            } catch (validationError) {
              console.error('Error validating token:', validationError);
              setIsConnected(false);
              setAccessToken(null);
            }
          }
          
          console.groupEnd();
        } else {
          console.log("[useGoogleCalendar] No token found in session");
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

  // Enhanced connect function that detects existing auth
  const connectGoogleCalendar = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if we're already authenticated with email
      const { data: authData } = await supabase.auth.getSession();
      const currentUser = authData?.session?.user;
      const isEmailUser = currentUser && !authData?.session?.provider_token;
      
      if (isEmailUser) {
        console.log("[useGoogleCalendar] User is logged in with email, checking for profile...", currentUser.id);
        
        // Check if user_profiles table exists
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
            
          if (!profileError && profileData) {
            console.log("[useGoogleCalendar] Found user profile, will link with Google:", profileData);
          } else {
            // If no profile yet, create one
            const { error: createError } = await supabase
              .from('user_profiles')
              .insert({
                user_id: currentUser.id,
                email: currentUser.email,
                auth_provider: 'email'
              });
              
            if (createError) {
              console.error("[useGoogleCalendar] Error creating user profile:", createError);
            } else {
              console.log("[useGoogleCalendar] Created profile for email user");
            }
          }
        } catch (e) {
          console.error("[useGoogleCalendar] Error managing user profile:", e);
          // Continue with auth flow even if profile creation fails
        }
      }
      
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Google Calendar';
      setError(errorMessage);
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

  // Helper function to determine if an event is likely a work appointment
  const isLikelyWorkAppointment = (event: GoogleCalendarEvent): boolean => {
    const eventTitle = event.summary?.toLowerCase() || '';
    const eventDescription = event.description?.toLowerCase() || '';
    
    // Check if any work-related keywords are in the title or description
    return WORK_APPOINTMENT_KEYWORDS.some(keyword => 
      eventTitle.includes(keyword.toLowerCase()) || 
      eventDescription.includes(keyword.toLowerCase())
    );
  };

  // NEW: Fetch events from Google Calendar
  const fetchEventsFromGoogleCalendar = async (
    startTime: Date | string,
    endTime: Date | string
  ): Promise<GoogleCalendarEvent[]> => {
    if (!isConnected || !accessToken) {
      toast.error("Not connected to Google Calendar");
      return [];
    }
    
    try {
      console.group('Fetching Google Calendar Events');
      
      // Convert dates to ISO strings if they're Date objects
      const startTimeISO = typeof startTime === 'string' ? startTime : startTime.toISOString();
      const endTimeISO = typeof endTime === 'string' ? endTime : endTime.toISOString();
      
      console.log(`Fetching events from ${new Date(startTimeISO).toLocaleString()} to ${new Date(endTimeISO).toLocaleString()}`);
      
      // Build the API URL with query parameters
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.append('timeMin', startTimeISO);
      url.searchParams.append('timeMax', endTimeISO);
      url.searchParams.append('singleEvents', 'true'); // Expand recurring events
      url.searchParams.append('orderBy', 'startTime');
      url.searchParams.append('maxResults', '2500'); // Google's maximum

      console.log('API Request URL:', url.toString());
      
      // Call the Google Calendar API
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Google API Error:', errorData);
        console.groupEnd();
        
        if (response.status === 401) {
          throw new Error('Google Calendar access token expired or revoked');
        } else {
          throw new Error(errorData.error?.message || 'Failed to fetch events from Google Calendar');
        }
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.items?.length || 0} events from Google Calendar`);
      
      // Sample of first few events for debugging
      if (data.items && data.items.length > 0) {
        console.log('Sample events:', data.items.slice(0, 3).map((e: any) => ({
          id: e.id,
          summary: e.summary,
          start: e.start?.dateTime,
          end: e.end?.dateTime
        })));
      }
      
      console.groupEnd();
      return data.items || [];
    } catch (err) {
      console.error('Error fetching Google Calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events from Google Calendar');
      toast.error("Failed to fetch events from Google Calendar");
      return [];
    }
  };

  // NEW: Convert Google Calendar event to appointment object
  const convertGoogleEventToAppointment = (
    googleEvent: GoogleCalendarEvent,
    clinicianId: string
  ): Partial<Appointment> => {
    // Extract client name from event summary
    let clientName = '';
    if (googleEvent.summary) {
      // If summary follows our format "Session with ClientName"
      const match = googleEvent.summary.match(/Session with (.+)/);
      clientName = match ? match[1] : googleEvent.summary;
    }
    
    return {
      clinician_id: clinicianId,
      client_id: null, // We'll try to find a matching client separately
      start_at: googleEvent.start.dateTime,
      end_at: googleEvent.end.dateTime,
      type: 'session', // Default type
      status: 'scheduled',
      notes: googleEvent.description || '',
      google_calendar_event_id: googleEvent.id,
      last_synced_at: new Date().toISOString()
    };
  };

  // NEW: Convert Google Calendar event to synced_event record
  const convertGoogleEventToSyncedEvent = (
    googleEvent: GoogleCalendarEvent,
    clinicianId: string
  ): Partial<SyncedEvent> => {
    return {
      clinician_id: clinicianId,
      start_at: googleEvent.start.dateTime,
      end_at: googleEvent.end.dateTime,
      google_calendar_event_id: googleEvent.id,
      original_title: googleEvent.summary || '',
      original_description: googleEvent.description,
      display_title: personalEventsLabel || 'Personal Block',
      is_visible: showPersonalEvents,
      last_synced_at: new Date().toISOString()
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
      
      // Get existing synced events as well
      const { data: existingSyncedEvents } = await supabase
        .from('synced_events')
        .select('*')
        .eq('clinician_id', clinicianId);
        
      const syncedEventsByGoogleId = new Map<string, SyncedEvent>();
      if (existingSyncedEvents) {
        existingSyncedEvents.forEach((event: SyncedEvent) => {
          if (event.google_calendar_event_id) {
            syncedEventsByGoogleId.set(event.google_calendar_event_id, event);
          }
        });
      }
      
      console.log(`Found ${appointmentsByGoogleId.size} existing appointments and ${syncedEventsByGoogleId.size} synced events with Google Calendar IDs`);
      
      // Process each Google Calendar event
      for (const googleEvent of googleEvents) {
        if (!googleEvent.id) {
          console.warn('Skipping Google event without ID:', googleEvent);
          continue;
        }
        
        try {
          const existingAppointment = appointmentsByGoogleId.get(googleEvent.id);
          const existingSyncedEvent = syncedEventsByGoogleId.get(googleEvent.id);
          
          // Determine if this is likely a work appointment or personal event
          const isWorkAppointment = isLikelyWorkAppointment(googleEvent);
          console.log(`Event "${googleEvent.summary}" classified as: ${isWorkAppointment ? 'Work Appointment' : 'Personal Event'}`);
          
          // WORK APPOINTMENT CASE - store in appointments table
          if (isWorkAppointment) {
            if (existingAppointment) {
              // Update existing appointment if Google event is newer
              const lastSyncTime = existingAppointment.last_synced_at 
                ? new Date(existingAppointment.last_synced_at).getTime()
                : 0;
                
              const googleUpdateTime = googleEvent.updated 
                ? new Date(googleEvent.updated).getTime() 
                : Infinity; // If no update time, assume it's newer
              
              if (googleUpdateTime > lastSyncTime) {
                console.log(`Updating existing appointment for work event: ${googleEvent.summary}`);
                
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
                  
                  // If there's also a synced_event entry for this, remove it
                  if (existingSyncedEvent) {
                    await supabase
                      .from('synced_events')
                      .delete()
                      .eq('id', existingSyncedEvent.id);
                    console.log(`Removed duplicate synced_event ${existingSyncedEvent.id}`);
                  }
                }
              } else {
                console.log(`Work event ${googleEvent.id} has not changed since last sync, skipping`);
              }
            } else {
              // Create new appointment from Google event
              console.log(`Creating new appointment for work event: ${googleEvent.summary}`);
              
              // Convert Google event to appointment
              const newAppointmentData = convertGoogleEventToAppointment(googleEvent, clinicianId);
              
              // Attempt to find a client ID based on the name
              if (googleEvent.summary) {
                const { data: clientData } = await supabase
                  .from('clients')
                  .select('id')
                  .ilike('client_preferred_name', `%${googleEvent.summary.replace('Session with ', '')}%`)
                  .limit(1);
                  
                if (clientData && clientData.length > 0) {
                  console.log(`Found matching client for "${googleEvent.summary}"`);
                  newAppointmentData.client_id = clientData[0].id;
                } else {
                  console.log(`No client found for "${googleEvent.summary}"`);
                }
              }
              
              // Insert new appointment
              const { data, error } = await supabase
                .from('appointments')
                .insert([newAppointmentData])
                .select();
                
              if (error) {
                console.error(`Error creating new appointment for work event ${googleEvent.id}:`, error);
                errors++;
              } else {
                console.log(`Created new appointment for work event ${googleEvent.id}`);
                created++;
                
                // If there's also a synced_event entry for this, remove it
                if (existingSyncedEvent) {
                  await supabase
                    .from('synced_events')
                    .delete()
                    .eq('id', existingSyncedEvent.id);
                  console.log(`Removed duplicate appointment ${existingAppointment.id}`);
                }
              }
            }
          }
          // PERSONAL EVENT CASE - store in synced_events table
          else {
            if (existingSyncedEvent) {
              // Update existing synced event if Google event is newer
              const lastSyncTime = existingSyncedEvent.last_synced_at 
                ? new Date(existingSyncedEvent.last_synced_at).getTime()
                : 0;
                
              const googleUpdateTime = googleEvent.updated 
                ? new Date(googleEvent.updated).getTime() 
                : Infinity;
              
              if (googleUpdateTime > lastSyncTime) {
                console.log(`Updating existing synced event for personal event: ${googleEvent.summary}`);
                
                // Update synced event with Google data
                const { data, error } = await supabase
                  .from('synced_events')
                  .update({
                    start_at: googleEvent.start.dateTime,
                    end_at: googleEvent.end.dateTime,
                    original_title: googleEvent.summary || '',
                    original_description: googleEvent.description || '',
                    display_title: personalEventsLabel,
                    is_visible: showPersonalEvents,
                    last_synced_at: new Date().toISOString()
                  })
                  .eq('id', existingSyncedEvent.id)
                  .select();
                  
                if (error) {
                  console.error(`Error updating synced event ${existingSyncedEvent.id}:`, error);
                  errors++;
                } else {
                  console.log(`Updated synced event ${existingSyncedEvent.id} with Google data`);
                  updated++;
                  
                  // If there's also an appointment entry for this, remove it
                  if (existingAppointment) {
                    await supabase
                      .from('appointments')
                      .delete()
                      .eq('id', existingAppointment.id);
                    console.log(`Removed duplicate appointment ${existingAppointment.id}`);
                  }
                }
              } else {
                console.log(`Personal event ${googleEvent.id} has not changed since last sync, skipping`);
              }
            } else {
              // Create new synced event from Google event
              console.log(`Creating new synced event for personal event: ${googleEvent.summary}`);
              
              // Convert Google event to synced event
              const newSyncedEventData = convertGoogleEventToSyncedEvent(googleEvent, clinicianId);
              
              // Insert new synced event
              const { data, error } = await supabase
                .from('synced_events')
                .insert([newSyncedEventData])
                .select();
                
              if (error) {
                console.error(`Error creating new synced event for personal event ${googleEvent.id}:`, error);
                errors++;
              } else {
                console.log(`Created new synced event for personal event ${googleEvent.id}`);
                created++;
                
                // If there's also an appointment entry for this, remove it
                if (existingAppointment) {
                  await supabase
                    .from('appointments')
                    .delete()
                    .eq('id', existingAppointment.id);
                  console.log(`Removed duplicate appointment ${existingAppointment.id}`);
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error processing Google event ${googleEvent.id}:`, err);
          errors++;
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
        toast.success(`Imported ${created + updated} events from Google Calendar (${created} new, ${updated} updated)`);
      } else if (errors > 0) {
        toast.error(`Failed to import events from Google Calendar (${errors} errors)`);
      } else {
        toast.info("No new events found in Google Calendar");
      }
      
      return result;
    } catch (err) {
      console.error('Error importing Google Calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to import events from Google Calendar');
      toast.error("Failed to import events from Google Calendar");
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
          succeeded: Array.from(toGoogleResult.values()).filter(Boolean).length
        },
        fromGoogle: fromGoogleResult
      });
      
      console.groupEnd();
      
      return {
        toGoogle: toGoogleResult,
        fromGoogle: fromGoogleResult
      };
    } catch (err) {
      console.error('Error during bidirectional sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync with Google Calendar');
      toast.error("Error during Google Calendar synchronization");
      
      return {
        toGoogle: new Map(),
        fromGoogle: { created: 0, updated: 0, errors: 1 }
      };
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
    syncDirection,
    setSyncDirection,
    personalEventsLabel,
    setPersonalEventsLabel,
    showPersonalEvents,
    setShowPersonalEvents,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    createGoogleCalendarEvent,
    updateGoogleCalendarEvent,
    syncMultipleAppointments,
    fetchEventsFromGoogleCalendar,
    importEventsFromGoogle,
    bidirectionalSync
  };
};
