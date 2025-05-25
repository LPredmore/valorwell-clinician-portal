import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { googleCalendarConnector } from '@/utils/googleCalendarSync';
import { 
  SyncStatus, 
  CalendarConnection, 
  SyncedEvent, 
  SyncConflict 
} from '@/types/calendarSync';
import { Appointment } from '@/types/appointment';

/**
 * Hook for interacting with Google Calendar
 * Provides functions for managing Google Calendar synchronization
 */
export const useGoogleCalendar = (userId: string) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [syncedEvents, setSyncedEvents] = useState<SyncedEvent[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const { toast } = useToast();

  // Fetch connection on mount
  useEffect(() => {
    if (userId) {
      fetchConnection();
    }
  }, [userId]);

  // Fetch connection details
  const fetchConnection = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calendar_connections')
        .select()
        .eq('user_id', userId)
        .eq('calendar_type', 'google')
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      if (data) {
        setConnection({
          id: data.id,
          userId: data.user_id,
          calendarType: data.calendar_type,
          calendarId: data.calendar_id,
          calendarName: data.calendar_name,
          status: data.status,
          lastSyncedAt: data.last_synced_at,
          conflictStrategy: data.conflict_strategy,
          syncDirection: data.sync_direction,
          syncFrequency: data.sync_frequency,
          syncRange: data.sync_range,
          filterTags: data.filter_tags,
          filterAppointmentTypes: data.filter_appointment_types,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          authDetails: data.auth_details
        });
        
        // Fetch synced events and conflicts
        fetchSyncedEvents(data.id);
        fetchConflicts(data.id);
      } else {
        setConnection(null);
        setSyncedEvents([]);
        setConflicts([]);
      }
    } catch (error) {
      console.error('Error fetching Google Calendar connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch Google Calendar connection',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  // Fetch synced events
  const fetchSyncedEvents = useCallback(async (connectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('synced_events')
        .select()
        .eq('connection_id', connectionId);
      
      if (error) {
        throw error;
      }
      
      setSyncedEvents(data || []);
    } catch (error) {
      console.error('Error fetching synced events:', error);
    }
  }, []);

  // Fetch conflicts
  const fetchConflicts = useCallback(async (connectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('sync_conflicts')
        .select()
        .eq('connection_id', connectionId)
        .eq('resolved', false);
      
      if (error) {
        throw error;
      }
      
      setConflicts(data || []);
    } catch (error) {
      console.error('Error fetching sync conflicts:', error);
    }
  }, []);

  // Connect to Google Calendar
  const connect = useCallback(async (authCode: string): Promise<boolean> => {
    try {
      setSyncing(true);
      
      // Connect using auth code
      const newConnection = await googleCalendarConnector.connect(userId, authCode);
      setConnection(newConnection);
      
      // Fetch synced events and conflicts
      if (newConnection.id) {
        await fetchSyncedEvents(newConnection.id);
        await fetchConflicts(newConnection.id);
      }
      
      toast({
        title: 'Connected',
        description: 'Successfully connected to Google Calendar',
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to Google Calendar',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [userId, fetchSyncedEvents, fetchConflicts, toast]);

  // Disconnect from Google Calendar
  const disconnect = useCallback(async (): Promise<boolean> => {
    if (!connection) return false;
    
    try {
      setSyncing(true);
      
      // Disconnect
      await googleCalendarConnector.disconnect(connection.id);
      
      // Update state
      setConnection(null);
      setSyncedEvents([]);
      setConflicts([]);
      
      toast({
        title: 'Disconnected',
        description: 'Successfully disconnected from Google Calendar',
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect from Google Calendar',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [connection, toast]);

  // Sync appointments with Google Calendar
  const syncAppointments = useCallback(async (): Promise<boolean> => {
    if (!connection) return false;
    
    try {
      setSyncing(true);
      
      // Start sync
      await googleCalendarConnector.startSync(connection.id);
      
      // Refresh connection and data
      await fetchConnection();
      
      toast({
        title: 'Sync Complete',
        description: 'Calendar synchronization completed successfully',
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to synchronize calendar',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [connection, fetchConnection, toast]);

  // Create event in Google Calendar
  const createEvent = useCallback(async (appointment: Appointment): Promise<SyncedEvent | null> => {
    if (!connection) return null;
    
    try {
      setSyncing(true);
      
      // Create event
      const syncedEvent = await googleCalendarConnector.createEvent(connection.id, appointment);
      
      // Update synced events
      setSyncedEvents(prev => [...prev, syncedEvent]);
      
      toast({
        title: 'Event Created',
        description: 'Appointment synced to Google Calendar',
        variant: 'default'
      });
      
      return syncedEvent;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event in Google Calendar',
        variant: 'destructive'
      });
      return null;
    } finally {
      setSyncing(false);
    }
  }, [connection, toast]);

  // Update event in Google Calendar
  const updateEvent = useCallback(async (syncedEventId: string, appointment: Appointment): Promise<SyncedEvent | null> => {
    if (!connection) return null;
    
    try {
      setSyncing(true);
      
      // Find synced event
      const syncedEvent = syncedEvents.find(e => e.id === syncedEventId);
      
      if (!syncedEvent) {
        throw new Error('Synced event not found');
      }
      
      // Update event
      const updatedEvent = await googleCalendarConnector.updateEvent(connection.id, syncedEvent, appointment);
      
      // Update synced events
      setSyncedEvents(prev => prev.map(e => e.id === syncedEventId ? updatedEvent : e));
      
      toast({
        title: 'Event Updated',
        description: 'Appointment updated in Google Calendar',
        variant: 'default'
      });
      
      return updatedEvent;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event in Google Calendar',
        variant: 'destructive'
      });
      return null;
    } finally {
      setSyncing(false);
    }
  }, [connection, syncedEvents, toast]);

  // Delete event from Google Calendar
  const deleteEvent = useCallback(async (syncedEventId: string): Promise<boolean> => {
    if (!connection) return false;
    
    try {
      setSyncing(true);
      
      // Find synced event
      const syncedEvent = syncedEvents.find(e => e.id === syncedEventId);
      
      if (!syncedEvent) {
        throw new Error('Synced event not found');
      }
      
      // Delete event
      await googleCalendarConnector.deleteEvent(connection.id, syncedEvent);
      
      // Update synced events
      setSyncedEvents(prev => prev.filter(e => e.id !== syncedEventId));
      
      toast({
        title: 'Event Deleted',
        description: 'Appointment removed from Google Calendar',
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event from Google Calendar',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [connection, syncedEvents, toast]);

  // Resolve a sync conflict
  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'external'): Promise<boolean> => {
    try {
      setSyncing(true);
      
      // Update conflict in database
      const { error } = await supabase
        .from('sync_conflicts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_strategy: resolution === 'local' ? 'local_wins' : 'external_wins'
        })
        .eq('id', conflictId);
      
      if (error) {
        throw error;
      }
      
      // Update conflicts state
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      
      // Refresh synced events
      if (connection) {
        await fetchSyncedEvents(connection.id);
      }
      
      toast({
        title: 'Conflict Resolved',
        description: `Conflict resolved with ${resolution} data`,
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve calendar sync conflict',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [connection, fetchSyncedEvents, toast]);

  // Update connection settings
  const updateSettings = useCallback(async (settings: Partial<CalendarConnection>): Promise<boolean> => {
    if (!connection) return false;
    
    try {
      setSyncing(true);
      
      // Update in database
      const { error } = await supabase
        .from('calendar_connections')
        .update(settings)
        .eq('id', connection.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setConnection({
        ...connection,
        ...settings
      });
      
      // If sync frequency changed, restart sync
      if (settings.syncFrequency && settings.syncFrequency !== connection.syncFrequency) {
        await googleCalendarConnector.stopSync(connection.id);
        await googleCalendarConnector.startSync(connection.id);
      }
      
      toast({
        title: 'Settings Updated',
        description: 'Calendar sync settings updated successfully',
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      console.error('Error updating connection settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calendar sync settings',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [connection, toast]);

  // Get sync status
  const getSyncStatus = useCallback(async (): Promise<SyncStatus | null> => {
    if (!connection) return null;
    
    try {
      return await googleCalendarConnector.getSyncStatus(connection.id);
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }, [connection]);

  // Find synced event for an appointment
  const findSyncedEvent = useCallback((appointmentId: string): SyncedEvent | null => {
    return syncedEvents.find(e => e.localAppointmentId === appointmentId) || null;
  }, [syncedEvents]);

  return {
    loading,
    syncing,
    connection,
    syncedEvents,
    conflicts,
    connect,
    disconnect,
    syncAppointments,
    createEvent,
    updateEvent,
    deleteEvent,
    resolveConflict,
    updateSettings,
    getSyncStatus,
    findSyncedEvent,
    refresh: fetchConnection
  };
};