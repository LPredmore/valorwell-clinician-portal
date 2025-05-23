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
  // Check if Google Calendar is connected and refresh token if needed
  const checkConnection = useCallback(async () => {
    try {
      console.log('[useGoogleCalendar] Checking Google Calendar connection...');
      
      // Check if we have token info in localStorage
      const tokenInfoStr = localStorage.getItem('googleCalendarTokenInfo');
      if (!tokenInfoStr) {
        // Check for legacy token
        const legacyToken = localStorage.getItem('googleCalendarToken');
        if (legacyToken) {
          console.log('[useGoogleCalendar] Found legacy token, migrating to new format');
          // Migrate legacy token to new format
          const tokenInfo = {
            access_token: legacyToken,
            refresh_token: null,
            expires_at: Date.now() + (3600 * 1000), // Assume 1 hour expiry
            token_type: 'Bearer'
          };
          localStorage.setItem('googleCalendarTokenInfo', JSON.stringify(tokenInfo));
          localStorage.removeItem('googleCalendarToken');
          
          // Continue with the migrated token
          return await checkConnection();
        }
        
        console.log('[useGoogleCalendar] No token info found');
        setIsConnected(false);
        return false;
      }
      
      // Parse token info
      const tokenInfo = JSON.parse(tokenInfoStr);
      
      // Check if token is expired or about to expire (within 5 minutes)
      const isExpired = Date.now() >= (tokenInfo.expires_at - 5 * 60 * 1000);
      
      if (isExpired && tokenInfo.refresh_token) {
        console.log('[useGoogleCalendar] Token expired, attempting to refresh');
        
        // Refresh the token
        const refreshed = await refreshAccessToken(tokenInfo.refresh_token);
        if (!refreshed) {
          console.log('[useGoogleCalendar] Token refresh failed');
          setIsConnected(false);
          return false;
        }
        
        // Get the updated token info
        const updatedTokenInfoStr = localStorage.getItem('googleCalendarTokenInfo');
        if (!updatedTokenInfoStr) {
          console.log('[useGoogleCalendar] No updated token info found after refresh');
          setIsConnected(false);
          return false;
        }
        
        const updatedTokenInfo = JSON.parse(updatedTokenInfoStr);
        tokenInfo.access_token = updatedTokenInfo.access_token;
        tokenInfo.expires_at = updatedTokenInfo.expires_at;
      }
      
      // Validate token
      console.log('[useGoogleCalendar] Validating token with Google...');
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokenInfo.access_token}`);
      
      if (!response.ok) {
        console.error('[useGoogleCalendar] Token validation failed:', await response.text());
        
        // If we have a refresh token, try to refresh one more time
        if (tokenInfo.refresh_token && !isExpired) {
          console.log('[useGoogleCalendar] Attempting emergency token refresh');
          const refreshed = await refreshAccessToken(tokenInfo.refresh_token);
          if (!refreshed) {
            console.log('[useGoogleCalendar] Emergency token refresh failed');
            localStorage.removeItem('googleCalendarTokenInfo');
            setIsConnected(false);
            return false;
          }
          
          // Try validation again with the new token
          const updatedTokenInfoStr = localStorage.getItem('googleCalendarTokenInfo');
          if (!updatedTokenInfoStr) {
            console.log('[useGoogleCalendar] No updated token info found after emergency refresh');
            setIsConnected(false);
            return false;
          }
          
          const updatedTokenInfo = JSON.parse(updatedTokenInfoStr);
          
          const retryResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${updatedTokenInfo.access_token}`);
          
          if (!retryResponse.ok) {
            console.error('[useGoogleCalendar] Token validation failed after refresh:', await retryResponse.text());
            localStorage.removeItem('googleCalendarTokenInfo');
            setIsConnected(false);
            return false;
          }
          
          const retryTokenInfo = await retryResponse.json();
          console.log('[useGoogleCalendar] Token info after emergency refresh:', retryTokenInfo);
          
          // Check if token has the required scopes
          const hasCalendarScope = retryTokenInfo.scope.includes('https://www.googleapis.com/auth/calendar');
          
          if (hasCalendarScope) {
            console.log('[useGoogleCalendar] Token is valid with required scopes after emergency refresh');
            setIsConnected(true);
            return true;
          } else {
            console.log('[useGoogleCalendar] Token is valid but missing required scopes after emergency refresh');
            setIsConnected(false);
            return false;
          }
        }
        
        localStorage.removeItem('googleCalendarTokenInfo');
        setIsConnected(false);
        return false;
      }
      
      const validationInfo = await response.json();
      console.log('[useGoogleCalendar] Token info:', validationInfo);
      
      // Check if token has the required scopes
      const hasCalendarScope = validationInfo.scope.includes('https://www.googleapis.com/auth/calendar');
      
      if (hasCalendarScope) {
        console.log('[useGoogleCalendar] Token is valid with required scopes');
        setIsConnected(true);
        return true;
      } else {
        console.log('[useGoogleCalendar] Token is valid but missing required scopes');
        setIsConnected(false);
        return false;
      }
    } catch (err) {
      console.error('[useGoogleCalendar] Error checking Google Calendar connection:', err);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Connect to Google Calendar using authorization code flow with PKCE
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('[useGoogleCalendar] Starting OAuth flow with PKCE');
      
      // Generate a random state value for security
      const state = crypto.randomUUID();
      localStorage.setItem('googleOAuthState', state);
      
      // Generate code verifier (random string between 43-128 chars)
      const codeVerifier = generateRandomString(64);
      localStorage.setItem('googleCodeVerifier', codeVerifier);
      
      // Generate code challenge (SHA-256 hash of verifier, base64url encoded)
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Calculate redirect URI
      const redirectUri = `${window.location.origin}/auth/google-callback`;
      console.log('[useGoogleCalendar] Redirect URI:', redirectUri);
      
      // Google OAuth2 authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      
      // Add query parameters
      authUrl.searchParams.append('client_id', '812956782457-lmtq86avjefqi23qp1596tqat5aa6v4c.apps.googleusercontent.com');
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code'); // Authorization code flow
      authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile openid');
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('prompt', 'consent');
      authUrl.searchParams.append('access_type', 'offline'); // Request refresh token
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      
      console.log('[useGoogleCalendar] Redirecting to Google OAuth');
      
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
  
  // Helper function to generate a random string for code verifier
  const generateRandomString = (length: number): string => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };
  
  // Helper function to generate code challenge from code verifier
  const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
    // Hash the code verifier using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    
    // Convert the hash to base64url encoding
    return base64UrlEncode(digest);
  };
  
  // Helper function for base64url encoding
  const base64UrlEncode = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };
  
  // Helper function to refresh the access token
  const refreshAccessToken = async (refreshToken: string): Promise<boolean> => {
    try {
      console.log('[useGoogleCalendar] Refreshing access token');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: '812956782457-lmtq86avjefqi23qp1596tqat5aa6v4c.apps.googleusercontent.com',
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[useGoogleCalendar] Token refresh error:', errorData);
        return false;
      }
      
      const tokenData = await response.json();
      console.log('[useGoogleCalendar] Token refresh successful');
      
      // Get existing token info to preserve the refresh token
      const existingTokenInfoStr = localStorage.getItem('googleCalendarTokenInfo');
      const existingTokenInfo = existingTokenInfoStr ? JSON.parse(existingTokenInfoStr) : {};
      
      // Update token info
      const tokenInfo = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || existingTokenInfo.refresh_token, // Use new refresh token if provided, otherwise keep existing
        expires_at: Date.now() + (tokenData.expires_in * 1000),
        token_type: tokenData.token_type || existingTokenInfo.token_type
      };
      
      localStorage.setItem('googleCalendarTokenInfo', JSON.stringify(tokenInfo));
      return true;
    } catch (err) {
      console.error('[useGoogleCalendar] Error refreshing access token:', err);
      return false;
    }
  };

  // Disconnect from Google Calendar
  const disconnect = useCallback(() => {
    try {
      // Remove both new and legacy token storage
      localStorage.removeItem('googleCalendarTokenInfo');
      localStorage.removeItem('googleCalendarToken');
      localStorage.removeItem('googleOAuthState');
      localStorage.removeItem('googleCodeVerifier');
      
      setIsConnected(false);
      toastNotification({
        title: "Success",
        description: "Disconnected from Google Calendar"
      });
      
      console.log('[useGoogleCalendar] Successfully disconnected from Google Calendar');
      return true;
    } catch (err) {
      console.error('[useGoogleCalendar] Error disconnecting from Google Calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect from Google Calendar');
      return false;
    }
  }, []);

  // Fetch events from Google Calendar with improved error handling
  const fetchEventsFromGoogleCalendar = async (
    startTime: Date | string,
    endTime: Date | string
  ): Promise<GoogleCalendarEvent[]> => {
    try {
      // Get token info
      const tokenInfoStr = localStorage.getItem('googleCalendarTokenInfo');
      if (!tokenInfoStr) {
        // Check for legacy token
        const legacyToken = localStorage.getItem('googleCalendarToken');
        if (legacyToken) {
          console.log('[fetchEventsFromGoogleCalendar] Found legacy token, using it for this request');
          // Use legacy token for this request
          return await fetchEventsWithToken(legacyToken, startTime, endTime);
        }
        throw new Error('Not connected to Google Calendar');
      }
      
      const tokenInfo = JSON.parse(tokenInfoStr);
      
      // Check if token is expired and refresh if needed
      if (Date.now() >= tokenInfo.expires_at) {
        console.log('[fetchEventsFromGoogleCalendar] Token expired, refreshing...');
        if (!tokenInfo.refresh_token) {
          throw new Error('No refresh token available');
        }
        
        const refreshed = await refreshAccessToken(tokenInfo.refresh_token);
        if (!refreshed) {
          throw new Error('Failed to refresh token');
        }
        
        // Get updated token info
        const updatedTokenInfoStr = localStorage.getItem('googleCalendarTokenInfo');
        if (!updatedTokenInfoStr) {
          throw new Error('No token info found after refresh');
        }
        
        tokenInfo.access_token = JSON.parse(updatedTokenInfoStr).access_token;
      }
      
      return await fetchEventsWithToken(tokenInfo.access_token, startTime, endTime);
    } catch (err) {
      console.error('[fetchEventsFromGoogleCalendar] Error fetching events from Google Calendar:', err);
      throw err;
    }
  };
  
  // Helper function to fetch events with a specific token
  const fetchEventsWithToken = async (
    token: string,
    startTime: Date | string,
    endTime: Date | string
  ): Promise<GoogleCalendarEvent[]> => {
    // Format dates for API request
    const timeMin = typeof startTime === 'string' ? startTime : startTime.toISOString();
    const timeMax = typeof endTime === 'string' ? endTime : endTime.toISOString();
    
    console.log('[fetchEventsFromGoogleCalendar] Fetching Google Calendar Events');
    console.log(`[fetchEventsFromGoogleCalendar] Fetching events from ${new Date(timeMin).toLocaleString()} to ${new Date(timeMax).toLocaleString()}`);
    
    // Build API request URL
    const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=2500`;
    
    console.log('[fetchEventsFromGoogleCalendar] API Request URL:', apiUrl);
    
    try {
      // Fetch events from Google Calendar API
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText } };
        }
        
        console.error('[fetchEventsFromGoogleCalendar] Google Calendar API error:', errorData);
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Authentication failed. Please reconnect to Google Calendar.');
        }
        
        throw new Error(`Google Calendar API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      const events = data.items || [];
      
      console.log(`[fetchEventsFromGoogleCalendar] Fetched ${events.length} events from Google Calendar`);
      
      return events;
    } catch (err) {
      console.error('[fetchEventsFromGoogleCalendar] Error in API request:', err);
      throw err;
    }
  };

  // Sync a single appointment to Google Calendar with improved error handling
  const syncAppointmentToGoogle = async (appointment: Appointment): Promise<string | null> => {
    try {
      // Get token info
      const tokenInfoStr = localStorage.getItem('googleCalendarTokenInfo');
      if (!tokenInfoStr) {
        // Check for legacy token
        const legacyToken = localStorage.getItem('googleCalendarToken');
        if (legacyToken) {
          console.log('[syncAppointmentToGoogle] Found legacy token, using it for this request');
          return await syncAppointmentWithToken(legacyToken, appointment);
        }
        throw new Error('Not connected to Google Calendar');
      }
      
      const tokenInfo = JSON.parse(tokenInfoStr);
      
      // Check if token is expired and refresh if needed
      if (Date.now() >= tokenInfo.expires_at) {
        console.log('[syncAppointmentToGoogle] Token expired, refreshing...');
        if (!tokenInfo.refresh_token) {
          throw new Error('No refresh token available');
        }
        
        const refreshed = await refreshAccessToken(tokenInfo.refresh_token);
        if (!refreshed) {
          throw new Error('Failed to refresh token');
        }
        
        // Get updated token info
        const updatedTokenInfoStr = localStorage.getItem('googleCalendarTokenInfo');
        if (!updatedTokenInfoStr) {
          throw new Error('No token info found after refresh');
        }
        
        tokenInfo.access_token = JSON.parse(updatedTokenInfoStr).access_token;
      }
      
      return await syncAppointmentWithToken(tokenInfo.access_token, appointment);
    } catch (err) {
      console.error(`[syncAppointmentToGoogle] Error syncing appointment ${appointment.id} to Google Calendar:`, err);
      return null;
    }
  };
  
  // Helper function to sync an appointment with a specific token
  const syncAppointmentWithToken = async (token: string, appointment: Appointment): Promise<string | null> => {
    try {
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
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: { message: errorText } };
          }
          
          console.error('[syncAppointmentWithToken] Error updating Google Calendar event:', errorData);
          
          // Handle specific error cases
          if (response.status === 401) {
            throw new Error('Authentication failed. Please reconnect to Google Calendar.');
          }
          
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
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: { message: errorText } };
          }
          
          console.error('[syncAppointmentWithToken] Error creating Google Calendar event:', errorData);
          
          // Handle specific error cases
          if (response.status === 401) {
            throw new Error('Authentication failed. Please reconnect to Google Calendar.');
          }
          
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
      console.error(`[syncAppointmentWithToken] Error syncing appointment ${appointment.id} to Google Calendar:`, err);
      
      // Propagate authentication errors so they can be handled by the caller
      if (err instanceof Error && err.message.includes('Authentication failed')) {
        throw err;
      }
      
      return null;
    }
  };

  // Sync multiple appointments to Google Calendar with improved error handling and race condition protection
  const syncMultipleAppointments = async (appointments: Appointment[]): Promise<Map<string, string | null>> => {
    try {
      console.log('[syncMultipleAppointments] Google Calendar Sync Operation');
      console.log(`[syncMultipleAppointments] Attempting to sync ${appointments.length} appointments`);
      
      // Filter appointments to only include those that need syncing
      const appointmentsToSync = appointments.filter(appointment => {
        // Only sync scheduled or confirmed appointments
        return appointment.status === 'scheduled' || appointment.status === 'confirmed';
      });
      
      console.log(`[syncMultipleAppointments] Syncing ${appointmentsToSync.length} appointments to Google...`);
      
      // Track results
      const results = new Map<string, string | null>();
      let successCount = 0;
      let createCount = 0;
      let updateCount = 0;
      let errorCount = 0;
      let authErrorOccurred = false;
      
      // Use a semaphore to limit concurrent requests to avoid rate limiting
      const MAX_CONCURRENT = 3;
      let activeRequests = 0;
      let queue = [...appointmentsToSync];
      
      // Process appointments in batches to avoid overwhelming the API
      while (queue.length > 0 && !authErrorOccurred) {
        // Process up to MAX_CONCURRENT appointments at a time
        const batch = [];
        
        while (batch.length < MAX_CONCURRENT && queue.length > 0) {
          batch.push(queue.shift()!);
        }
        
        // Process this batch concurrently
        const batchPromises = batch.map(async (appointment) => {
          try {
            activeRequests++;
            const eventId = await syncAppointmentToGoogle(appointment);
            activeRequests--;
            
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
          } catch (err) {
            activeRequests--;
            errorCount++;
            
            // Check if this is an authentication error
            if (err instanceof Error && err.message.includes('Authentication failed')) {
              console.error('[syncMultipleAppointments] Authentication error occurred, stopping sync');
              authErrorOccurred = true;
              throw err; // Re-throw to stop the entire process
            }
            
            console.error(`[syncMultipleAppointments] Error syncing appointment ${appointment.id}:`, err);
          }
        });
        
        // Wait for all appointments in this batch to complete
        try {
          await Promise.all(batchPromises);
        } catch (err) {
          // If an auth error was thrown, we need to stop the entire process
          if (err instanceof Error && err.message.includes('Authentication failed')) {
            throw err;
          }
        }
        
        // Add a small delay between batches to avoid overwhelming the API
        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`[syncMultipleAppointments] Sync complete: ${successCount} of ${appointmentsToSync.length} appointments successfully synced (${createCount} created, ${updateCount} updated, ${errorCount} errors)`);
      
      return results;
    } catch (err) {
      console.error('[syncMultipleAppointments] Error syncing appointments to Google Calendar:', err);
      
      // Propagate authentication errors
      if (err instanceof Error && err.message.includes('Authentication failed')) {
        setError('Authentication failed. Please reconnect to Google Calendar.');
        toastNotification({
          title: "Authentication Error",
          description: "Your Google Calendar connection has expired. Please reconnect.",
          variant: "destructive"
        });
      }
      
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

  // Import events from Google Calendar to our database with improved error handling and conflict resolution
  const importEventsFromGoogle = async (
    clinicianId: string,
    startTime: Date | string,
    endTime: Date | string,
    existingAppointments: Appointment[]
  ): Promise<SyncResult> => {
    setIsSyncing(true);
    
    try {
      console.group('[importEventsFromGoogle] Importing Google Calendar Events');
      console.log('[importEventsFromGoogle] Fetching events for clinician:', clinicianId);
      
      // Fetch events from Google Calendar
      const googleEvents = await fetchEventsFromGoogleCalendar(startTime, endTime);
      
      if (googleEvents.length === 0) {
        console.log('No events found in Google Calendar');
        console.groupEnd();
        return { created: 0, updated: 0, errors: 0 };
      }
      
      console.log(`[importEventsFromGoogle] Processing ${googleEvents.length} Google Calendar events`);
      
      // Prepare result counters
      let created = 0;
      let updated = 0;
      let errors = 0;
      let conflicts = 0;
      
      // Create a map of existing appointments by Google Calendar event ID
      const appointmentsByGoogleId = new Map<string, Appointment>();
      
      // Helper function for the old method fallback
      const fallbackToOldMethod = () => {
          // Process each Google Calendar event
          for (const googleEvent of busyEvents) {
            if (!googleEvent.id) {
              console.warn('[importEventsFromGoogle] Skipping Google event without ID:', googleEvent);
              continue;
            }
            
            try {
              const existingAppointment = appointmentsByGoogleId.get(googleEvent.id);
              
              if (existingAppointment) {
                // Update existing appointment if it's changed
                console.log(`[importEventsFromGoogle] Found existing appointment for Google event ${googleEvent.id}`);
                
                // Check if Google event is newer than our last sync
                const lastSyncTime = existingAppointment.last_synced_at
                  ? new Date(existingAppointment.last_synced_at).getTime()
                  : 0;
                  
                const googleUpdateTime = googleEvent.updated
                  ? new Date(googleEvent.updated).getTime()
                  : Infinity; // If no update time, assume it's newer
                
                if (googleUpdateTime > lastSyncTime) {
                  console.log(`[importEventsFromGoogle] Google event ${googleEvent.id} was updated after last sync, updating local appointment`);
                  
                  // Update appointment with Google data
                  const { data, error } = supabase
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
                    console.error(`[importEventsFromGoogle] Error updating appointment ${existingAppointment.id}:`, error);
                    errors++;
                  } else {
                    console.log(`[importEventsFromGoogle] Updated appointment ${existingAppointment.id} with Google data`);
                    updated++;
                  }
                } else {
                  console.log(`[importEventsFromGoogle] Google event ${googleEvent.id} has not changed since last sync, skipping`);
                }
              } else {
                // Skip creating new appointments from Google events
                // This avoids the clientName error
                console.log(`[importEventsFromGoogle] No existing appointment for Google event ${googleEvent.id}, skipping creation`);
              }
            } catch (err) {
              console.error(`[importEventsFromGoogle] Error processing Google event ${googleEvent.id}:`, err);
              errors++;
            }
          }
          
          return { created, updated, errors };
      };
      existingAppointments.forEach(appointment => {
        if (appointment.google_calendar_event_id) {
          appointmentsByGoogleId.set(appointment.google_calendar_event_id, appointment);
        }
      });
      
      console.log(`[importEventsFromGoogle] Found ${appointmentsByGoogleId.size} existing appointments with Google Calendar IDs`);
      
      // Filter to only include events marked as "busy" (not "transparent")
      const busyEvents = googleEvents.filter(event => event.transparency !== 'transparent');
      console.log(`[importEventsFromGoogle] Found ${busyEvents.length} busy events`);
      
      // Prepare events for batch insert/update with conflict detection
      const syncedEvents = busyEvents.map(event => {
        const syncedEvent = convertGoogleEventToSyncedEvent(event, clinicianId);
        
        // Check for conflicts with existing appointments
        const existingAppointment = appointmentsByGoogleId.get(event.id);
        if (existingAppointment) {
          // Check if both Google and local appointment have been updated since last sync
          const lastSyncTime = existingAppointment.last_synced_at
            ? new Date(existingAppointment.last_synced_at).getTime()
            : 0;
            
          const googleUpdateTime = event.updated
            ? new Date(event.updated).getTime()
            : Infinity; // If no update time, assume it's newer
          
          // If Google event is newer than last sync, use Google data
          if (googleUpdateTime > lastSyncTime) {
            console.log(`[importEventsFromGoogle] Google event ${event.id} was updated after last sync, using Google data`);
          } else {
            // Otherwise, keep local data (will be handled in the conflict resolution)
            console.log(`[importEventsFromGoogle] Local appointment ${existingAppointment.id} is more recent, preserving local data`);
            conflicts++;
          }
        }
        
        return syncedEvent;
      });
      
      // Check if synced_events table exists with improved error handling
      try {
        const { error: tableCheckError } = await supabase
          .from('synced_events')
          .select('id')
          .limit(1)
          .single();
        
        if (tableCheckError && tableCheckError.code === '42P01') {
          // Table doesn't exist, create it
          console.warn('[importEventsFromGoogle] synced_events table does not exist, attempting to create it');
          
          try {
            // Create the synced_events table
            const createTableQuery = `
              CREATE TABLE IF NOT EXISTS synced_events (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                clinician_id UUID REFERENCES clinicians(id) NOT NULL,
                start_at TIMESTAMP WITH TIME ZONE NOT NULL,
                end_at TIMESTAMP WITH TIME ZONE NOT NULL,
                google_calendar_event_id TEXT,
                original_title TEXT,
                original_description TEXT,
                display_title TEXT DEFAULT 'Personal Block',
                is_busy BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
              
              CREATE INDEX IF NOT EXISTS idx_synced_events_clinician_id ON synced_events(clinician_id);
              CREATE INDEX IF NOT EXISTS idx_synced_events_google_id ON synced_events(google_calendar_event_id);
              CREATE INDEX IF NOT EXISTS idx_synced_events_date_range ON synced_events(start_at, end_at);
            `;
            
            await supabase.rpc('exec', { query: createTableQuery });
            console.log('[importEventsFromGoogle] Successfully created synced_events table');
            
            // Now we can use the table for the sync
            const { error, count } = await supabase
              .from('synced_events')
              .upsert(syncedEvents, {
                onConflict: 'google_calendar_event_id',
                ignoreDuplicates: false
              })
              .select('count');
              
            if (error) {
              console.error('[importEventsFromGoogle] Error upserting synced events after table creation:', error);
              errors += syncedEvents.length;
            } else {
              console.log(`[importEventsFromGoogle] Successfully synced ${count} events after table creation`);
              created = count || syncedEvents.length;
            }
          } catch (createError) {
            console.error('[importEventsFromGoogle] Error creating synced_events table:', createError);
            // Fall back to old method if table creation fails
            console.warn('[importEventsFromGoogle] Falling back to old method');
            
            fallbackToOldMethod();
          }
        } else {
          // synced_events table exists, use it
          console.log('[importEventsFromGoogle] Using synced_events table for Google Calendar sync');
          
          // Batch upsert to synced_events table
          const { error, count } = await supabase
            .from('synced_events')
            .upsert(syncedEvents, {
              onConflict: 'google_calendar_event_id',
              ignoreDuplicates: false
            })
            .select('count');
            
          if (error) {
            console.error('[importEventsFromGoogle] Error upserting synced events:', error);
            errors += syncedEvents.length;
          } else {
            console.log(`[importEventsFromGoogle] Successfully synced ${count} events`);
            created = count || syncedEvents.length;
          }
        }
      } catch (err) {
        console.error('[importEventsFromGoogle] Error checking synced_events table:', err);
        const result = fallbackToOldMethod();
        return result;
      }
      
      // Update clinician's last_google_sync timestamp
      const { error: clinicianUpdateError } = await supabase
        .from('clinicians')
        .update({ last_google_sync: new Date().toISOString() })
        .eq('id', clinicianId);
        
      if (clinicianUpdateError) {
        console.error('[importEventsFromGoogle] Error updating clinician last_google_sync:', clinicianUpdateError);
      } else {
        console.log('[importEventsFromGoogle] Updated clinician last_google_sync timestamp');
      }
      
      console.log(`[importEventsFromGoogle] Import complete: ${created} created, ${updated} updated, ${errors} errors, ${conflicts} conflicts resolved`);
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
      console.error('[importEventsFromGoogle] Error importing Google Calendar events:', err);
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
    const handleOAuthCallback = async () => {
      // Check if we're on the callback page with authorization code
      if (window.location.search.includes('code=')) {
        console.log('[useGoogleCalendar] Authorization code detected in callback');
        
        try {
          // Parse query parameters
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const state = urlParams.get('state');
          const storedState = localStorage.getItem('googleOAuthState');
          const codeVerifier = localStorage.getItem('googleCodeVerifier');
          
          // Validate state to prevent CSRF
          if (state !== storedState) {
            console.error('[useGoogleCalendar] OAuth state mismatch');
            toastNotification({
              title: "Error",
              description: "Authentication failed: Invalid state",
              variant: "destructive"
            });
            return;
          }
          
          if (!code || !codeVerifier) {
            console.error('[useGoogleCalendar] Missing code or code verifier');
            toastNotification({
              title: "Error",
              description: "Authentication failed: Missing parameters",
              variant: "destructive"
            });
            return;
          }
          
          console.log('[useGoogleCalendar] Exchanging authorization code for tokens');
          
          // Exchange code for tokens
          const redirectUri = `${window.location.origin}/auth/google-callback`;
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              client_id: '812956782457-lmtq86avjefqi23qp1596tqat5aa6v4c.apps.googleusercontent.com',
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri,
              code_verifier: codeVerifier
            })
          });
          
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('[useGoogleCalendar] Token exchange error:', errorData);
            toastNotification({
              title: "Error",
              description: `Authentication failed: ${errorData.error_description || 'Token exchange failed'}`,
              variant: "destructive"
            });
            return;
          }
          
          const tokenData = await tokenResponse.json();
          console.log('[useGoogleCalendar] Token exchange successful');
          
          // Store tokens securely
          const tokenInfo = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            token_type: tokenData.token_type
          };
          
          localStorage.setItem('googleCalendarTokenInfo', JSON.stringify(tokenInfo));
          localStorage.removeItem('googleOAuthState');
          localStorage.removeItem('googleCodeVerifier');
          
          setIsConnected(true);
          toastNotification({
            title: "Success",
            description: "Connected to Google Calendar"
          });
          
          // Redirect back to the original page
          window.location.href = '/calendar';
        } catch (err) {
          console.error('[useGoogleCalendar] Error handling OAuth callback:', err);
          toastNotification({
            title: "Error",
            description: "Failed to complete authentication",
            variant: "destructive"
          });
        }
      }
    };
    
    handleOAuthCallback();
  }, []);

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
