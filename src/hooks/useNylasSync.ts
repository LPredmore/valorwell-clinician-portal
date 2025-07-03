
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncMapping {
  id: string;
  appointment_id: string;
  external_event_id: string;
  connection_id: string;
  sync_direction: 'inbound' | 'outbound' | 'bidirectional';
  last_sync_hash?: string;
  created_at: string;
  updated_at: string;
}

interface SyncStatus {
  isSyncing: boolean;
  lastSyncError: string | null;
  syncMappings: Record<string, SyncMapping>;
}

export const useNylasSync = () => {
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncError: null,
    syncMappings: {}
  });

  const syncAppointment = useCallback(async (
    appointmentId: string,
    action: 'create' | 'update' | 'delete',
    nylasCalendarId?: string,
    eventId?: string,
    retryCount = 3
  ) => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true, lastSyncError: null }));

    let attempt = 0;
    while (attempt < retryCount) {
      try {
        console.log(`[useNylasSync] Syncing appointment ${appointmentId} with action: ${action}, attempt: ${attempt + 1}`);
        
        // Get current session for auth header
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Authentication required');
        }

        const payload = {
          appointmentId,
          action,
          nylasCalendarId: nylasCalendarId || 'primary',
          eventId
        };

        console.log('[useNylasSync] Sending payload:', payload);

        const { data, error } = await supabase.functions.invoke('nylas-sync-appointments', {
          body: payload,
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) {
          throw new Error(error.message || 'Sync failed');
        }

        console.log('[useNylasSync] Sync successful:', data);
        
        // Update sync status on success
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncError: null
        }));

        // Refresh sync mappings
        await loadSyncMappings([appointmentId]);

        toast({
          title: 'Calendar Sync Successful',
          description: data?.message || 'Appointment has been synced to your external calendar'
        });

        return data;
      } catch (error) {
        attempt++;
        console.error(`[useNylasSync] Sync attempt ${attempt} failed:`, error);
        
        if (attempt >= retryCount) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
          setSyncStatus(prev => ({
            ...prev,
            isSyncing: false,
            lastSyncError: errorMessage
          }));

          toast({
            title: 'Calendar Sync Failed',
            description: errorMessage,
            variant: 'destructive'
          });
          
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [toast]);

  const syncBusyEvent = useCallback(async (
    event: { start: string; end: string; title: string },
    rbcCalendarId: string = 'primary'
  ) => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true, lastSyncError: null }));

    try {
      console.log('[useNylasSync] Syncing busy event to RBC:', event);

      // Get current session for auth header
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      const payload = {
        action: 'create' as const,
        nylasCalendarId: rbcCalendarId,
        event
      };

      console.log('[useNylasSync] Sending busy event payload:', payload);

      const { data, error } = await supabase.functions.invoke('nylas-sync-appointments', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message || 'Busy event sync failed');
      }

      console.log('[useNylasSync] Busy event sync successful:', data);
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncError: null
      }));

      toast({
        title: 'Busy Event Synced',
        description: data?.message || 'External event has been added to your RBC calendar'
      });

      return data;
    } catch (error) {
      console.error('[useNylasSync] Busy event sync failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncError: errorMessage
      }));

      toast({
        title: 'Busy Event Sync Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      
      throw error;
    }
  }, [toast]);

  const loadSyncMappings = useCallback(async (appointmentIds?: string[]) => {
    try {
      let query = supabase
        .from('external_calendar_mappings')
        .select('*');

      if (appointmentIds && appointmentIds.length > 0) {
        query = query.in('appointment_id', appointmentIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useNylasSync] Failed to load sync mappings:', error);
        throw error;
      }

      const mappings: Record<string, SyncMapping> = {};
      data?.forEach(mapping => {
        mappings[mapping.appointment_id] = mapping;
      });

      setSyncStatus(prev => ({
        ...prev,
        syncMappings: mappings
      }));

      console.log(`[useNylasSync] Loaded ${Object.keys(mappings).length} sync mappings`);
      return mappings;
    } catch (error) {
      console.error('[useNylasSync] Failed to load sync mappings:', error);
      return {};
    }
  }, []);

  const getSyncStatusForAppointment = useCallback((appointmentId: string) => {
    const mapping = syncStatus.syncMappings[appointmentId];
    return {
      isSynced: !!mapping,
      syncDirection: mapping?.sync_direction,
      externalEventId: mapping?.external_event_id,
      lastSynced: mapping?.updated_at,
      syncMapping: mapping
    };
  }, [syncStatus.syncMappings]);

  const deleteSyncMapping = useCallback(async (appointmentId: string) => {
    try {
      console.log(`[useNylasSync] Deleting sync mapping for appointment: ${appointmentId}`);
      
      const mapping = syncStatus.syncMappings[appointmentId];
      if (!mapping) {
        console.log('[useNylasSync] No mapping found to delete');
        return;
      }

      await syncAppointment(appointmentId, 'delete', undefined, mapping.external_event_id);
      
      // Remove from local state
      setSyncStatus(prev => ({
        ...prev,
        syncMappings: Object.fromEntries(
          Object.entries(prev.syncMappings).filter(([id]) => id !== appointmentId)
        )
      }));

      toast({
        title: 'Sync Removed',
        description: 'Appointment is no longer synced with external calendar'
      });
    } catch (error) {
      console.error('[useNylasSync] Failed to delete sync mapping:', error);
      throw error;
    }
  }, [syncAppointment, syncStatus.syncMappings, toast]);

  return {
    syncStatus,
    syncAppointment,
    syncBusyEvent,
    loadSyncMappings,
    getSyncStatusForAppointment,
    deleteSyncMapping
  };
};
