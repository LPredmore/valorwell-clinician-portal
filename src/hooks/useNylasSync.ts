
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
    action: 'sync_appointment_to_calendar' | 'sync_calendar_to_appointments' | 'delete',
    appointmentId: string,
    retryCount = 3
  ) => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true, lastSyncError: null }));

    let attempt = 0;
    while (attempt < retryCount) {
      try {
        console.log(`[useNylasSync] Syncing appointment ${appointmentId} with action: ${action}, attempt: ${attempt + 1}`);
        
        const { data, error } = await supabase.functions.invoke('nylas-sync-appointments', {
          body: {
            action,
            appointmentId
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
        await loadSyncMappings();

        toast({
          title: 'Calendar Sync Successful',
          description: 'Appointment has been synced to your external calendar'
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

  const loadSyncMappings = useCallback(async (appointmentIds?: string[]) => {
    try {
      let query = supabase
        .from('external_calendar_mappings')
        .select('*');

      if (appointmentIds) {
        query = query.in('appointment_id', appointmentIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappings: Record<string, SyncMapping> = {};
      data?.forEach(mapping => {
        mappings[mapping.appointment_id] = mapping;
      });

      setSyncStatus(prev => ({
        ...prev,
        syncMappings: mappings
      }));

      return mappings;
    } catch (error) {
      console.error('[useNylasSync] Failed to load sync mappings:', error);
    }
  }, []);

  const getSyncStatusForAppointment = useCallback((appointmentId: string) => {
    const mapping = syncStatus.syncMappings[appointmentId];
    return {
      isSynced: !!mapping,
      syncDirection: mapping?.sync_direction,
      externalEventId: mapping?.external_event_id,
      lastSynced: mapping?.updated_at
    };
  }, [syncStatus.syncMappings]);

  const deleteSyncMapping = useCallback(async (appointmentId: string) => {
    try {
      await syncAppointment('delete', appointmentId);
      
      // Remove from local state
      setSyncStatus(prev => ({
        ...prev,
        syncMappings: Object.fromEntries(
          Object.entries(prev.syncMappings).filter(([id]) => id !== appointmentId)
        )
      }));
    } catch (error) {
      console.error('[useNylasSync] Failed to delete sync mapping:', error);
      throw error;
    }
  }, [syncAppointment]);

  return {
    syncStatus,
    syncAppointment,
    loadSyncMappings,
    getSyncStatusForAppointment,
    deleteSyncMapping
  };
};
