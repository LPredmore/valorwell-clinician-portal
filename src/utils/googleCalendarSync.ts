
/**
 * Google Calendar Synchronization Utility
 * Handles two-way synchronization between the application and Google Calendar
 */

import { 
  CalendarConnector, 
  CalendarConnection, 
  ExternalCalendarType, 
  SyncedEvent, 
  SyncStatus,
  GoogleAuthDetails,
  SyncConflict
} from '@/types/calendarSync';
import { Appointment } from '@/types/appointment';
import { supabase } from '@/integrations/supabase/client';
import { DateTime } from 'luxon';

// Google API configuration
const GOOGLE_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = `${window.location.origin}/settings/calendar-sync/google/callback`;

// Scopes required for Google Calendar API
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Google Calendar Connector Implementation
 * Implements the CalendarConnector interface for Google Calendar
 */
export class GoogleCalendarConnector implements CalendarConnector {
  private syncIntervals: Record<string, NodeJS.Timeout> = {};

  /**
   * Generate Google OAuth URL for authorization
   */
  public getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Connect to Google Calendar using authorization code
   * @param userId User ID
   * @param authCode Authorization code from Google OAuth
   */
  public async connect(userId: string, authCode: string): Promise<CalendarConnection> {
    try {
      // Exchange auth code for tokens
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code: authCode,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Failed to exchange auth code: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Get user's primary calendar info
      const calendarResponse = await fetch(`${GOOGLE_API_BASE_URL}/calendars/primary`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      if (!calendarResponse.ok) {
        throw new Error(`Failed to get calendar info: ${calendarResponse.statusText}`);
      }

      const calendarData = await calendarResponse.json();
      
      // Calculate token expiration
      const expiresAt = DateTime.now().plus({ seconds: tokenData.expires_in }).toISO();
      
      // Create auth details object
      const authDetails: GoogleAuthDetails = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        scope: tokenData.scope
      };
      
      // Insert connection record in database
      const { data: connection, error } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: userId,
          calendar_type: ExternalCalendarType.GOOGLE,
          calendar_id: calendarData.id,
          calendar_name: calendarData.summary || 'Google Calendar',
          status: SyncStatus.CONNECTED,
          auth_details: authDetails
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create connection: ${error.message}`);
      }
      
      // Log the connection
      await this.logSyncEvent(connection.id, 'sync_started', {
        message: 'Initial connection established',
        calendarId: calendarData.id,
        calendarName: calendarData.summary
      });
      
      // Start initial sync
      await this.startSync(connection.id);
      
      return this.mapDbConnectionToInterface(connection);
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      throw new Error(`Failed to connect to Google Calendar: ${error.message}`);
    }
  }

  /**
   * Disconnect from Google Calendar
   * @param connectionId Connection ID
   */
  public async disconnect(connectionId: string): Promise<boolean> {
    try {
      // Stop any active sync
      await this.stopSync(connectionId);
      
      // Get connection details
      const { data: connection, error: fetchError } = await supabase
        .from('calendar_connections')
        .select()
        .eq('id', connectionId)
        .single();
      
      if (fetchError) {
        throw new Error(`Failed to fetch connection: ${fetchError.message}`);
      }
      
      // Revoke Google token if available
      if (connection?.auth_details?.accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${connection.auth_details.accessToken}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
        } catch (revokeError) {
          console.warn('Failed to revoke token:', revokeError);
          // Continue with disconnection even if token revocation fails
        }
      }
      
      // Update connection status
      const { error: updateError } = await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.DISCONNECTED,
          auth_details: null
        })
        .eq('id', connectionId);
      
      if (updateError) {
        throw new Error(`Failed to update connection: ${updateError.message}`);
      }
      
      // Log the disconnection
      await this.logSyncEvent(connectionId, 'sync_completed', {
        message: 'Connection disconnected'
      });
      
      return true;
    } catch (error) {
      console.error('Google Calendar disconnection error:', error);
      throw new Error(`Failed to disconnect from Google Calendar: ${error.message}`);
    }
  }

  /**
   * Refresh authentication tokens
   * @param connectionId Connection ID
   */
  public async refreshAuth(connectionId: string): Promise<boolean> {
    try {
      // Get connection details
      const { data: connection, error: fetchError } = await supabase
        .from('calendar_connections')
        .select()
        .eq('id', connectionId)
        .single();
      
      if (fetchError || !connection) {
        throw new Error(`Failed to fetch connection: ${fetchError?.message}`);
      }
      
      const authDetails = connection.auth_details as GoogleAuthDetails;
      
      if (!authDetails?.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Exchange refresh token for new access token
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          refresh_token: authDetails.refreshToken,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Failed to refresh token: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Calculate new expiration
      const expiresAt = DateTime.now().plus({ seconds: tokenData.expires_in }).toISO();
      
      // Update auth details
      const updatedAuthDetails: GoogleAuthDetails = {
        ...authDetails,
        accessToken: tokenData.access_token,
        expiresAt,
        scope: tokenData.scope || authDetails.scope
      };
      
      // Update connection in database
      const { error: updateError } = await supabase
        .from('calendar_connections')
        .update({
          auth_details: updatedAuthDetails,
          status: SyncStatus.CONNECTED
        })
        .eq('id', connectionId);
      
      if (updateError) {
        throw new Error(`Failed to update connection: ${updateError.message}`);
      }
      
      return true;
    } catch (error) {
      console.error('Google Calendar token refresh error:', error);
      
      // Update connection status to error
      await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.ERROR
        })
        .eq('id', connectionId);
      
      // Log the error
      await this.logSyncEvent(connectionId, 'sync_failed', {
        message: 'Token refresh failed'
      }, error.message);
      
      throw new Error(`Failed to refresh Google Calendar token: ${error.message}`);
    }
  }

  /**
   * List available calendars for the user
   * @param connectionId Connection ID
   */
  public async listCalendars(connectionId: string): Promise<{id: string, name: string}[]> {
    try {
      const accessToken = await this.getAccessToken(connectionId);
      
      const response = await fetch(`${GOOGLE_API_BASE_URL}/users/me/calendarList`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list calendars: ${response.statusText}`);
      }

      const data = await response.json();
      
      return (data.items || []).map(calendar => ({
        id: calendar.id,
        name: calendar.summary
      }));
    } catch (error) {
      console.error('Google Calendar list error:', error);
      throw new Error(`Failed to list Google Calendars: ${error.message}`);
    }
  }

  /**
   * Fetch events from Google Calendar
   * @param connectionId Connection ID
   * @param startDate Start date (ISO string)
   * @param endDate End date (ISO string)
   */
  public async fetchEvents(connectionId: string, startDate: string, endDate: string): Promise<SyncedEvent[]> {
    try {
      // Get connection details
      const { data: connection, error: fetchError } = await supabase
        .from('calendar_connections')
        .select()
        .eq('id', connectionId)
        .single();
      
      if (fetchError || !connection) {
        throw new Error(`Failed to fetch connection: ${fetchError?.message}`);
      }
      
      const accessToken = await this.getAccessToken(connectionId);
      const calendarId = connection.calendar_id;
      
      // Fetch events from Google Calendar
      const params = new URLSearchParams({
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate).toISOString(),
        singleEvents: 'true',
        maxResults: '2500'
      });
      
      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      const now = new Date().toISOString();
      
      // Convert Google events to SyncedEvent format
      const syncedEvents: SyncedEvent[] = (data.items || []).map(event => {
        // Handle all-day events
        const isAllDay = Boolean(event.start.date);
        let startAt = isAllDay ? `${event.start.date}T00:00:00Z` : event.start.dateTime;
        let endAt = isAllDay ? `${event.end.date}T00:00:00Z` : event.end.dateTime;
        
        return {
          id: '', // Will be assigned by database
          connectionId,
          localAppointmentId: null, // Will be linked later if matching appointment found
          externalEventId: event.id,
          externalCalendarId: calendarId,
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          location: event.location || null,
          startAt,
          endAt,
          allDay: isAllDay,
          recurrenceRule: event.recurrence ? event.recurrence.join('\n') : null,
          status: this.mapGoogleStatusToSyncedStatus(event.status),
          lastSyncedAt: now,
          lastModifiedAt: now,
          externalLastModifiedAt: event.updated || now,
          syncStatus: 'synced',
          syncError: null,
          createdAt: now,
          updatedAt: now
        };
      });
      
      // Log the fetch
      await this.logSyncEvent(connectionId, 'sync_completed', {
        message: 'Events fetched from Google Calendar',
        count: syncedEvents.length,
        timeRange: { startDate, endDate }
      });
      
      return syncedEvents;
    } catch (error) {
      console.error('Google Calendar fetch events error:', error);
      
      // Log the error
      await this.logSyncEvent(connectionId, 'sync_failed', {
        message: 'Failed to fetch events',
        timeRange: { startDate, endDate }
      }, error.message);
      
      throw new Error(`Failed to fetch Google Calendar events: ${error.message}`);
    }
  }

  /**
   * Create a new event in Google Calendar
   * @param connectionId Connection ID
   * @param appointment Appointment to create in Google Calendar
   */
  public async createEvent(connectionId: string, appointment: Appointment): Promise<SyncedEvent> {
    try {
      // Get connection details
      const { data: connection, error: fetchError } = await supabase
        .from('calendar_connections')
        .select()
        .eq('id', connectionId)
        .single();
      
      if (fetchError || !connection) {
        throw new Error(`Failed to fetch connection: ${fetchError?.message}`);
      }
      
      const accessToken = await this.getAccessToken(connectionId);
      const calendarId = connection.calendar_id;
      
      // Create event payload
      const eventPayload = {
        summary: `${appointment.clientName || 'Appointment'} - ${appointment.type}`,
        description: appointment.notes || '',
        start: {
          dateTime: appointment.start_at,
          timeZone: 'UTC'
        },
        end: {
          dateTime: appointment.end_at,
          timeZone: 'UTC'
        },
        status: this.mapAppointmentStatusToGoogleStatus(appointment.status)
      };
      
      // Create event in Google Calendar
      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }

      const eventData = await response.json();
      const now = new Date().toISOString();
      
      // Create synced event record
      const syncedEvent: Partial<SyncedEvent> = {
        connectionId,
        localAppointmentId: appointment.id,
        externalEventId: eventData.id,
        externalCalendarId: calendarId,
        title: eventData.summary,
        description: eventData.description || null,
        location: eventData.location || null,
        startAt: eventData.start.dateTime,
        endAt: eventData.end.dateTime,
        allDay: Boolean(eventData.start.date),
        recurrenceRule: eventData.recurrence ? eventData.recurrence.join('\n') : null,
        status: this.mapGoogleStatusToSyncedStatus(eventData.status),
        lastSyncedAt: now,
        lastModifiedAt: now,
        externalLastModifiedAt: eventData.updated || now,
        syncStatus: 'synced',
        syncError: null
      };
      
      // Insert synced event record
      const { data: insertedEvent, error: insertError } = await supabase
        .from('synced_events')
        .insert(syncedEvent)
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Failed to insert synced event: ${insertError.message}`);
      }
      
      // Log the creation
      await this.logSyncEvent(connectionId, 'event_created', {
        message: 'Event created in Google Calendar',
        appointmentId: appointment.id,
        externalEventId: eventData.id
      });
      
      return insertedEvent as SyncedEvent;
    } catch (error) {
      console.error('Google Calendar create event error:', error);
      
      // Log the error
      await this.logSyncEvent(connectionId, 'sync_failed', {
        message: 'Failed to create event',
        appointmentId: appointment.id
      }, error.message);
      
      throw new Error(`Failed to create Google Calendar event: ${error.message}`);
    }
  }

  /**
   * Update an existing event in Google Calendar
   * @param connectionId Connection ID
   * @param syncedEvent Existing synced event
   * @param appointment Updated appointment data
   */
  public async updateEvent(connectionId: string, syncedEvent: SyncedEvent, appointment: Appointment): Promise<SyncedEvent> {
    try {
      // Get connection details
      const { data: connection, error: fetchError } = await supabase
        .from('calendar_connections')
        .select()
        .eq('id', connectionId)
        .single();
      
      if (fetchError || !connection) {
        throw new Error(`Failed to fetch connection: ${fetchError?.message}`);
      }
      
      const accessToken = await this.getAccessToken(connectionId);
      const calendarId = syncedEvent.externalCalendarId;
      const eventId = syncedEvent.externalEventId;
      
      // Create event payload
      const eventPayload = {
        summary: `${appointment.clientName || 'Appointment'} - ${appointment.type}`,
        description: appointment.notes || '',
        start: {
          dateTime: appointment.start_at,
          timeZone: 'UTC'
        },
        end: {
          dateTime: appointment.end_at,
          timeZone: 'UTC'
        },
        status: this.mapAppointmentStatusToGoogleStatus(appointment.status)
      };
      
      // Update event in Google Calendar
      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`);
      }

      const eventData = await response.json();
      const now = new Date().toISOString();
      
      // Update synced event record
      const updatedSyncedEvent: Partial<SyncedEvent> = {
        title: eventData.summary,
        description: eventData.description || null,
        location: eventData.location || null,
        startAt: eventData.start.dateTime,
        endAt: eventData.end.dateTime,
        allDay: Boolean(eventData.start.date),
        recurrenceRule: eventData.recurrence ? eventData.recurrence.join('\n') : null,
        status: this.mapGoogleStatusToSyncedStatus(eventData.status),
        lastSyncedAt: now,
        lastModifiedAt: now,
        externalLastModifiedAt: eventData.updated || now,
        syncStatus: 'synced',
        syncError: null
      };
      
      // Update synced event in database
      const { data: updatedEvent, error: updateError } = await supabase
        .from('synced_events')
        .update(updatedSyncedEvent)
        .eq('id', syncedEvent.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Failed to update synced event: ${updateError.message}`);
      }
      
      // Log the update
      await this.logSyncEvent(connectionId, 'event_updated', {
        message: 'Event updated in Google Calendar',
        appointmentId: appointment.id,
        externalEventId: eventId
      });
      
      return updatedEvent as SyncedEvent;
    } catch (error) {
      console.error('Google Calendar update event error:', error);
      
      // Log the error
      await this.logSyncEvent(connectionId, 'sync_failed', {
        message: 'Failed to update event',
        appointmentId: appointment.id,
        externalEventId: syncedEvent.externalEventId
      }, error.message);
      
      throw new Error(`Failed to update Google Calendar event: ${error.message}`);
    }
  }

  /**
   * Delete an event from Google Calendar
   * @param connectionId Connection ID
   * @param syncedEvent Synced event to delete
   */
  public async deleteEvent(connectionId: string, syncedEvent: SyncedEvent): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken(connectionId);
      const calendarId = syncedEvent.externalCalendarId;
      const eventId = syncedEvent.externalEventId;
      
      // Delete event from Google Calendar
      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok && response.status !== 410) { // 410 Gone means already deleted
        throw new Error(`Failed to delete event: ${response.statusText}`);
      }
      
      // Delete synced event from database
      const { error: deleteError } = await supabase
        .from('synced_events')
        .delete()
        .eq('id', syncedEvent.id);
      
      if (deleteError) {
        throw new Error(`Failed to delete synced event: ${deleteError.message}`);
      }
      
      // Log the deletion
      await this.logSyncEvent(connectionId, 'event_deleted', {
        message: 'Event deleted from Google Calendar',
        externalEventId: eventId
      });
      
      return true;
    } catch (error) {
      console.error('Google Calendar delete event error:', error);
      
      // Log the error
      await this.logSyncEvent(connectionId, 'sync_failed', {
        message: 'Failed to delete event',
        externalEventId: syncedEvent.externalEventId
      }, error.message);
      
      // Mark the event as pending deletion
      await supabase
        .from('synced_events')
        .update({
          syncStatus: 'pending_delete',
          syncError: error.message
        })
        .eq('id', syncedEvent.id);
      
      throw new Error(`Failed to delete Google Calendar event: ${error.message}`);
    }
  }

  /**
   * Start synchronization for a connection
   * @param connectionId Connection ID
   */
  public async startSync(connectionId: string): Promise<void> {
    try {
      // Get connection details
      const { data: connection, error: fetchError } = await supabase
        .from('calendar_connections')
        .select()
        .eq('id', connectionId)
        .single();
      
      if (fetchError || !connection) {
        throw new Error(`Failed to fetch connection: ${fetchError?.message}`);
      }
      
      // Update connection status
      await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.SYNCING
        })
        .eq('id', connectionId);
      
      // Perform initial sync
      await this.performSync(connectionId);
      
      // Set up recurring sync based on frequency
      const syncFrequency = connection.sync_frequency;
      let intervalMs = 3600000; // Default: hourly (3600000 ms)
      
      if (syncFrequency === 'realtime') {
        intervalMs = 300000; // 5 minutes
      } else if (syncFrequency === 'daily') {
        intervalMs = 86400000; // 24 hours
      } else if (syncFrequency === 'manual') {
        // No automatic sync for manual frequency
        return;
      }
      
      // Clear any existing interval
      if (this.syncIntervals[connectionId]) {
        clearInterval(this.syncIntervals[connectionId]);
      }
      
      // Set up new interval
      this.syncIntervals[connectionId] = setInterval(() => {
        this.performSync(connectionId).catch(error => {
          console.error(`Scheduled sync error for connection ${connectionId}:`, error);
        });
      }, intervalMs);
      
      // Update connection status
      await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.CONNECTED
        })
        .eq('id', connectionId);
      
      // Log sync started
      await this.logSyncEvent(connectionId, 'sync_started', {
        message: 'Synchronization started',
        frequency: syncFrequency,
        intervalMs
      });
    } catch (error) {
      console.error('Google Calendar start sync error:', error);
      
      // Update connection status to error
      await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.ERROR
        })
        .eq('id', connectionId);
      
      // Log the error
      await this.logSyncEvent(connectionId, 'sync_failed', {
        message: 'Failed to start synchronization'
      }, error.message);
      
      throw new Error(`Failed to start Google Calendar sync: ${error.message}`);
    }
  }

  /**
   * Stop synchronization for a connection
   * @param connectionId Connection ID
   */
  public async stopSync(connectionId: string): Promise<void> {
    try {
      // Clear interval if exists
      if (this.syncIntervals[connectionId]) {
        clearInterval(this.syncIntervals[connectionId]);
        delete this.syncIntervals[connectionId];
      }
      
      // Update connection status
      await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.PAUSED
        })
        .eq('id', connectionId);
      
      // Log sync stopped
      await this.logSyncEvent(connectionId, 'sync_completed', {
        message: 'Synchronization stopped'
      });
    } catch (error) {
      console.error('Google Calendar stop sync error:', error);
      throw new Error(`Failed to stop Google Calendar sync: ${error.message}`);
    }
  }

  /**
   * Get current sync status for a connection
   * @param connectionId Connection ID
   */
  public async getSyncStatus(connectionId: string): Promise<SyncStatus> {
    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('status')
        .eq('id', connectionId)
        .single();
      
      if (error) {
        throw new Error(`Failed to get connection status: ${error.message}`);
      }
      
      return data.status as SyncStatus;
    } catch (error) {
      console.error('Google Calendar get status error:', error);
      throw new Error(`Failed to get Google Calendar sync status: ${error.message}`);
    }
  }

  /**
   * Perform a full synchronization cycle
   * @param connectionId Connection ID
   * @private
   */
  private async performSync(connectionId: string): Promise<void> {
    try {
      // Get connection details
      const { data: connection, error: fetchError } = await supabase
        .from('calendar_connections')
        .select()
        .eq('id', connectionId)
        .single();
      
      if (fetchError || !connection) {
        throw new Error(`Failed to fetch connection: ${fetchError?.message}`);
      }
      
      // Update connection status
      await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.SYNCING
        })
        .eq('id', connectionId);
      
      // Calculate date range based on sync_range
      const syncRange = connection.sync_range || { pastDays: 30, futureDays: 90 };
      const startDate = DateTime.now().minus({ days: syncRange.pastDays }).startOf('day').toISO();
      const endDate = DateTime.now().plus({ days: syncRange.futureDays }).endOf('day').toISO();
      
      // Fetch events from Google Calendar
      const externalEvents = await this.fetchEvents(connectionId, startDate, endDate);
      
      // Fetch existing synced events
      const { data: existingSyncedEvents, error: syncedEventsError } = await supabase
        .from('synced_events')
        .select()
        .eq('connection_id', connectionId);
      
      if (syncedEventsError) {
        throw new Error(`Failed to fetch existing synced events: ${syncedEventsError.message}`);
      }
      
      // Fetch local appointments
      const { data: localAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id, client_id, clinician_id, start_at, end_at, type, status, 
          notes, appointment_recurring, recurring_group_id,
          clients (client_first_name, client_last_name, client_preferred_name, client_email, client_phone)
        `)
        .gte('start_at', startDate)
        .lte('end_at', endDate);
      
      if (appointmentsError) {
        throw new Error(`Failed to fetch local appointments: ${appointmentsError.message}`);
      }
      
      // Process each external event
      for (const externalEvent of externalEvents) {
        // Check if event already exists in our system
        const existingSyncedEvent = existingSyncedEvents?.find(
          e => e.external_event_id === externalEvent.externalEventId
        );
        
        if (existingSyncedEvent) {
          // Event exists - check for updates
          if (new Date(existingSyncedEvent.external_last_modified_at) < new Date(externalEvent.externalLastModifiedAt)) {
            // External event was updated - update our record
            await this.updateSyncedEventFromExternal(existingSyncedEvent.id, externalEvent);
          }
        } else {
          // New event - create in our system
          await this.createSyncedEventFromExternal(connectionId, externalEvent);
        }
      }
      
      // Check for deleted events
      if (existingSyncedEvents) {
        for (const existingEvent of existingSyncedEvents) {
          const stillExists = externalEvents.some(e => e.externalEventId === existingEvent.external_event_id);
          
          if (!stillExists && existingEvent.sync_status !== 'pending_delete') {
            // Event was deleted in Google Calendar - handle deletion
            await this.handleExternalEventDeletion(existingEvent.id);
          }
        }
      }
      
      // Process local appointments that need to be synced to Google
      if (connection.sync_direction !== 'from_external') {
        for (const appointment of localAppointments) {
          // Check if appointment is already synced
          const existingSyncedEvent = existingSyncedEvents?.find(
            e => e.local_appointment_id === appointment.id
          );
          
          if (!existingSyncedEvent) {
            // New appointment - create in Google Calendar
            await this.createEvent(connectionId, this.processAppointmentData(appointment));
          } else if (this.hasAppointmentChanged(appointment, existingSyncedEvent)) {
            // Appointment was updated - update in Google Calendar
            await this.updateEvent(
              connectionId, 
              existingSyncedEvent as SyncedEvent, 
              this.processAppointmentData(appointment)
            );
          }
        }
      }
      
      // Update connection with last synced time
      await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.CONNECTED,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', connectionId);
      
      // Log sync completion
      await this.logSyncEvent(connectionId, 'sync_completed', {
        message: 'Synchronization completed',
        externalEventsCount: externalEvents.length,
        localAppointmentsCount: localAppointments.length
      });
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      
      // Update connection status to error
      await supabase
        .from('calendar_connections')
        .update({
          status: SyncStatus.ERROR
        })
        .eq('id', connectionId);
      
      // Log the error
      await this.logSyncEvent(connectionId, 'sync_failed', {
        message: 'Synchronization failed'
      }, error.message);
      
      throw error;
    }
  }

  /**
   * Get a valid access token for the connection
   * @param connectionId Connection ID
   * @private
   */
  private async getAccessToken(connectionId: string): Promise<string> {
    // Get connection details
    const { data: connection, error } = await supabase
      .from('calendar_connections')
      .select()
      .eq('id', connectionId)
      .single();
    
    if (error || !connection) {
      throw new Error(`Failed to fetch connection: ${error?.message}`);
    }
    
    const authDetails = connection.auth_details as GoogleAuthDetails;
    
    if (!authDetails?.accessToken) {
      throw new Error('No access token available');
    }
    
    // Check if token is expired
    const expiresAt = new Date(authDetails.expiresAt);
    const now = new Date();
    
    // If token expires in less than 5 minutes, refresh it
    if (expiresAt.getTime() - now.getTime() < 300000) {
      await this.refreshAuth(connectionId);
      
      // Get updated connection
      const { data: updatedConnection, error: refreshError } = await supabase
        .from('calendar_connections')
        .select()
        .eq('id', connectionId)
        .single();
      
      if (refreshError || !updatedConnection) {
        throw new Error(`Failed to fetch updated connection: ${refreshError?.message}`);
      }
      
      const updatedAuthDetails = updatedConnection.auth_details as GoogleAuthDetails;
      return updatedAuthDetails.accessToken;
    }
    
    return authDetails.accessToken;
  }

  /**
   * Log a sync event to the database
   * @param connectionId Connection ID
   * @param eventType Event type
   * @param details Event details
   * @param error Error message (if any)
   * @private
   */
  private async logSyncEvent(
    connectionId: string, 
    eventType: string, 
    details: Record<string, any> = {}, 
    error: string = null
  ): Promise<void> {
    try {
      await supabase
        .from('sync_logs')
        .insert({
          connection_id: connectionId,
          event_type: eventType,
          details,
          error
        });
    } catch (logError) {
      console.error('Failed to log sync event:', logError);
      // Don't throw here to avoid disrupting the main sync process
    }
  }

  /**
   * Map Google Calendar status to synced event status
   * @param googleStatus Google Calendar status
   * @private
   */
  private mapGoogleStatusToSyncedStatus(googleStatus: string): 'confirmed' | 'tentative' | 'cancelled' {
    switch (googleStatus) {
      case 'confirmed':
        return 'confirmed';
      case 'tentative':
        return 'tentative';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  /**
   * Map appointment status to Google Calendar status
   * @param appointmentStatus Appointment status
   * @private
   */
  private mapAppointmentStatusToGoogleStatus(appointmentStatus: string): string {
    switch (appointmentStatus) {
      case 'scheduled':
      case 'confirmed':
      case 'completed':
        return 'confirmed';
      case 'pending':
        return 'tentative';
      case 'cancelled':
      case 'no_show':
      case 'rescheduled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  /**
   * Map database connection record to interface
   * @param dbConnection Database connection record
   * @private
   */
  private mapDbConnectionToInterface(dbConnection: any): CalendarConnection {
    return {
      id: dbConnection.id,
      userId: dbConnection.user_id,
      calendarType: dbConnection.calendar_type as ExternalCalendarType,
      calendarId: dbConnection.calendar_id,
      calendarName: dbConnection.calendar_name,
      status: dbConnection.status as SyncStatus,
      lastSyncedAt: dbConnection.last_synced_at,
      conflictStrategy: dbConnection.conflict_strategy,
      syncDirection: dbConnection.sync_direction,
      syncFrequency: dbConnection.sync_frequency,
      syncRange: dbConnection.sync_range,
      filterTags: dbConnection.filter_tags,
      filterAppointmentTypes: dbConnection.filter_appointment_types,
      createdAt: dbConnection.created_at,
      updatedAt: dbConnection.updated_at,
      authDetails: dbConnection.auth_details
    };
  }

  /**
   * Process appointment data from database to Appointment interface
   * @param dbAppointment Database appointment record
   * @private
   */
  private processAppointmentData(dbAppointment: any): Appointment {
    // Format client name
    let clientName = '';
    if (dbAppointment.clients) {
      const preferredName = dbAppointment.clients.client_preferred_name;
      const firstName = dbAppointment.clients.client_first_name;
      const lastName = dbAppointment.clients.client_last_name;
      
      if (preferredName && lastName) {
        clientName = `${preferredName} ${lastName}`;
      } else if (firstName && lastName) {
        clientName = `${firstName} ${lastName}`;
      }
    }
    
    return {
      id: dbAppointment.id,
      client_id: dbAppointment.client_id,
      clinician_id: dbAppointment.clinician_id,
      start_at: dbAppointment.start_at,
      end_at: dbAppointment.end_at,
      type: dbAppointment.type,
      status: dbAppointment.status,
      notes: dbAppointment.notes,
      appointment_recurring: dbAppointment.appointment_recurring,
      recurring_group_id: dbAppointment.recurring_group_id,
      client: dbAppointment.clients,
      clientName
    };
  }

  /**
   * Check if an appointment has changed compared to its synced event
   * @param appointment Appointment
   * @param syncedEvent Synced event
   * @private
   */
  private hasAppointmentChanged(appointment: any, syncedEvent: any): boolean {
    // Check for changes in key fields
    return (
      new Date(appointment.start_at).getTime() !== new Date(syncedEvent.start_at).getTime() ||
      new Date(appointment.end_at).getTime() !== new Date(syncedEvent.end_at).getTime() ||
      appointment.status !== syncedEvent.status ||
      appointment.notes !== syncedEvent.description
    );
  }

  /**
   * Update a synced event from external data
   * @param syncedEventId Synced event ID
   * @param externalEvent External event data
   * @private
   */
  private async updateSyncedEventFromExternal(syncedEventId: string, externalEvent: Partial<SyncedEvent>): Promise<void> {
    try {
      const { error } = await supabase
        .from('synced_events')
        .update({
          title: externalEvent.title,
          description: externalEvent.description,
          location: externalEvent.location,
          start_at: externalEvent.startAt,
          end_at: externalEvent.endAt,
          all_day: externalEvent.allDay,
          recurrence_rule: externalEvent.recurrenceRule,
          status: externalEvent.status,
          last_synced_at: new Date().toISOString(),
          external_last_modified_at: externalEvent.externalLastModifiedAt,
          sync_status: 'synced',
          sync_error: null
        })
        .eq('id', syncedEventId);
      
      if (error) {
        throw new Error(`Failed to update synced event: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to update synced event from external:', error);
      throw error;
    }
  }

  /**
   * Create a new synced event from external data
   * @param connectionId Connection ID
   * @param externalEvent External event data
   * @private
   */
  private async createSyncedEventFromExternal(connectionId: string, externalEvent: Partial<SyncedEvent>): Promise<void> {
    try {
      const { error } = await supabase
        .from('synced_events')
        .insert({
          connection_id: connectionId,
          local_appointment_id: null,
          external_event_id: externalEvent.externalEventId,
          external_calendar_id: externalEvent.externalCalendarId,
          title: externalEvent.title,
          description: externalEvent.description,
          location: externalEvent.location,
          start_at: externalEvent.startAt,
          end_at: externalEvent.endAt,
          all_day: externalEvent.allDay,
          recurrence_rule: externalEvent.recurrenceRule,
          status: externalEvent.status,
          last_synced_at: new Date().toISOString(),
          last_modified_at: new Date().toISOString(),
          external_last_modified_at: externalEvent.externalLastModifiedAt,
          sync_status: 'synced',
          sync_error: null
        });
      
      if (error) {
        throw new Error(`Failed to create synced event: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to create synced event from external:', error);
      throw error;
    }
  }

  /**
   * Handle deletion of an event from external calendar
   * @param syncedEventId Synced event ID
   * @private
   */
  private async handleExternalEventDeletion(syncedEventId: string): Promise<void> {
    try {
      // Get synced event details
      const { data: syncedEvent, error: fetchError } = await supabase
        .from('synced_events')
        .select('connection_id, local_appointment_id')
        .eq('id', syncedEventId)
        .single();
      
      if (fetchError) {
        throw new Error(`Failed to fetch synced event: ${fetchError.message}`);
      }
      
      // If there's a linked local appointment, mark it as cancelled
      if (syncedEvent.local_appointment_id) {
        await supabase
          .from('appointments')
          .update({
            status: 'cancelled'
          })
          .eq('id', syncedEvent.local_appointment_id);
      }
      
      // Delete the synced event
      const { error: deleteError } = await supabase
        .from('synced_events')
        .delete()
        .eq('id', syncedEventId);
      
      if (deleteError) {
        throw new Error(`Failed to delete synced event: ${deleteError.message}`);
      }
      
      // Log the deletion
      await this.logSyncEvent(syncedEvent.connection_id, 'event_deleted', {
        message: 'Event deleted from external calendar',
        syncedEventId
      });
    } catch (error) {
      console.error('Failed to handle external event deletion:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of the Google Calendar connector
 */
export const googleCalendarConnector = new GoogleCalendarConnector();
