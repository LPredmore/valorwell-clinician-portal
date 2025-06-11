
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

interface NylasConnection {
  id: string;
  email: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  calendar_ids?: string[];
}

export const useNylasIntegration = () => {
  const [connections, setConnections] = useState<NylasConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const { userId, authInitialized } = useUser();

  // Fetch user's calendar connections
  const fetchConnections = async () => {
    if (!authInitialized || !userId) {
      console.log('[useNylasIntegration] Skipping fetch - auth not ready');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[useNylasIntegration] Fetching connections for user:', userId);
      
      const { data, error } = await supabase
        .from('nylas_connections')
        .select('id, email, provider, is_active, created_at, calendar_ids')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useNylasIntegration] Database error:', error);
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          toast({
            title: 'Setup Required',
            description: 'Calendar integration is not yet configured. Please contact support.',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return;
      }

      console.log('[useNylasIntegration] Fetched connections:', data);
      setConnections(data || []);
    } catch (error: any) {
      console.error('[useNylasIntegration] Error fetching connections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar connections',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize calendar connection
  const connectCalendar = async () => {
    if (!authInitialized || !userId) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to connect a calendar',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsConnecting(true);
      console.log('[useNylasIntegration] Initializing calendar connection');

      const { data, error } = await supabase.functions.invoke('nylas-auth', {
        body: { action: 'initialize' }
      });

      if (error) {
        console.error('[useNylasIntegration] Function error:', error);
        throw error;
      }

      if (data?.authUrl) {
        console.log('[useNylasIntegration] Opening OAuth window');
        const popup = window.open(
          data.authUrl,
          'nylas-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            setTimeout(fetchConnections, 1000);
          }
        }, 1000);
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error('[useNylasIntegration] Error connecting calendar:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to initialize calendar connection',
        variant: 'destructive'
      });
      setIsConnecting(false);
    }
  };

  // Disconnect calendar
  const disconnectCalendar = async (connectionId: string) => {
    try {
      console.log('[useNylasIntegration] Disconnecting calendar:', connectionId);
      
      const { error } = await supabase.functions.invoke('nylas-auth', {
        body: {
          action: 'disconnect',
          connectionId
        }
      });

      if (error) throw error;

      toast({
        title: 'Calendar Disconnected',
        description: 'Calendar has been successfully disconnected'
      });

      fetchConnections();
    } catch (error: any) {
      console.error('[useNylasIntegration] Error disconnecting calendar:', error);
      toast({
        title: 'Disconnection Failed',
        description: error.message || 'Failed to disconnect calendar',
        variant: 'destructive'
      });
    }
  };

  // Sync appointment to external calendars
  const syncAppointmentToExternal = async (appointmentId: string, force = false) => {
    try {
      console.log('[useNylasIntegration] Syncing appointment:', appointmentId);
      
      const { data, error } = await supabase.functions.invoke('nylas-sync-appointments', {
        body: {
          action: 'sync_to_external',
          appointmentId,
          force
        }
      });

      if (error) throw error;

      const successCount = data?.results?.filter((r: any) => r.status === 'synced').length || 0;
      const failCount = data?.results?.filter((r: any) => r.status === 'failed').length || 0;

      if (successCount > 0) {
        toast({
          title: 'Sync Successful',
          description: `Appointment synced to ${successCount} external calendar(s)`
        });
      }

      if (failCount > 0) {
        toast({
          title: 'Partial Sync',
          description: `${failCount} calendar(s) failed to sync`,
          variant: 'destructive'
        });
      }

      return data;
    } catch (error: any) {
      console.error('[useNylasIntegration] Error syncing appointment:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync appointment to external calendars',
        variant: 'destructive'
      });
      throw error;
    }
  };

  useEffect(() => {
    if (authInitialized && userId) {
      fetchConnections();
    }
  }, [authInitialized, userId]);

  return {
    connections,
    isLoading,
    isConnecting,
    connectCalendar,
    disconnectCalendar,
    syncAppointmentToExternal,
    refreshConnections: fetchConnections
  };
};
