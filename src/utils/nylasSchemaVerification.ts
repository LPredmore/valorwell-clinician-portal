
import { supabase } from '@/integrations/supabase/client';

export interface ExternalCalendarMapping {
  id: string;
  appointment_id: string;
  external_event_id: string;
  connection_id: string;
  sync_direction: 'inbound' | 'outbound' | 'bidirectional';
  last_sync_hash?: string;
  created_at: string;
  updated_at: string;
}

export const verifyNylasSchema = async (): Promise<{
  hasExternalMappingsTable: boolean;
  hasNylasConnectionsTable: boolean;
  hasCalendarSyncLogsTable: boolean;
}> => {
  try {
    // Test external_calendar_mappings table
    const { error: mappingsError } = await supabase
      .from('external_calendar_mappings')
      .select('id')
      .limit(1);

    // Test nylas_connections table
    const { error: connectionsError } = await supabase
      .from('nylas_connections')
      .select('id')
      .limit(1);

    // Test calendar_sync_logs table
    const { error: logsError } = await supabase
      .from('calendar_sync_logs')
      .select('id')
      .limit(1);

    return {
      hasExternalMappingsTable: !mappingsError,
      hasNylasConnectionsTable: !connectionsError,
      hasCalendarSyncLogsTable: !logsError
    };
  } catch (error) {
    console.error('[verifyNylasSchema] Schema verification failed:', error);
    return {
      hasExternalMappingsTable: false,
      hasNylasConnectionsTable: false,
      hasCalendarSyncLogsTable: false
    };
  }
};

export const logSyncOperation = async (
  connectionId: string,
  operation: string,
  syncType: string,
  appointmentId?: string,
  externalEventId?: string,
  status: 'pending' | 'success' | 'error' = 'pending',
  errorMessage?: string,
  syncData?: any
) => {
  try {
    const { error } = await supabase
      .from('calendar_sync_logs')
      .insert({
        connection_id: connectionId,
        operation,
        sync_type: syncType,
        appointment_id: appointmentId,
        external_event_id: externalEventId,
        status,
        error_message: errorMessage,
        sync_data: syncData
      });

    if (error) {
      console.error('[logSyncOperation] Failed to log sync operation:', error);
    }
  } catch (error) {
    console.error('[logSyncOperation] Error logging sync operation:', error);
  }
};
