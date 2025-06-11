
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Fetch user's calendar connections
  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('nylas_connections')
        .select('id, email, provider, is_active, created_at, calendar_ids')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar connections",
        variant: "destructive"
      });
      if (error?.status === 406) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to view calendar connections',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load calendar connections',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize calendar connection
  const connectCalendar = async () => {
    try {
      setIsConnecting(true);
      

      const { data, error } = await supabase.functions.invoke('nylas-auth', {
        body: { action: 'initialize' }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth window
        const popup = window.open(
          data.authUrl,
          'nylas-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for OAuth completion
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            // Refresh connections after OAuth
            setTimeout(fetchConnections, 1000);
          }
        }, 1000);
      }
    } catch (error) {
    } catch (error: any) {
      console.error('Error connecting calendar:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initialize calendar connection",
        variant: "destructive"
      });
      if (error?.status === 406) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to connect a calendar',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: 'Failed to initialize calendar connection',
          variant: 'destructive'
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect calendar
  const disconnectCalendar = async (connectionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('nylas-auth', {
        body: { 
        body: {
          action: 'disconnect',
          connectionId 
          connectionId
        }
      });

      if (error) throw error;

      toast({
        title: "Calendar Disconnected",
        description: "Calendar has been successfully disconnected"
        title: 'Calendar Disconnected',
        description: 'Calendar has been successfully disconnected'
      });

      fetchConnections();
    } catch (error) {
    } catch (error: any) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect calendar",
        variant: "destructive"
      });
      if (error?.status === 406) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to disconnect this calendar',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Disconnection Failed',
          description: 'Failed to disconnect calendar',
          variant: 'destructive'
        });
      }
    }
  };

  // Sync appointment to external calendars
  const syncAppointmentToExternal = async (appointmentId: string, force = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('nylas-sync-appointments', {
        body: { 
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
          title: "Sync Successful",
          title: 'Sync Successful',
          description: `Appointment synced to ${successCount} external calendar(s)`
        });
      }

      if (failCount > 0) {
        toast({
          title: "Partial Sync",
          title: 'Partial Sync',
          description: `${failCount} calendar(s) failed to sync`,
          variant: "destructive"
          variant: 'destructive'
        });
      }

      return data;
    } catch (error) {
    } catch (error: any) {
      console.error('Error syncing appointment:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync appointment to external calendars",
        variant: "destructive"
      });
      if (error?.status === 406) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to sync this appointment',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: 'Failed to sync appointment to external calendars',
          variant: 'destructive'
        });
      }
      throw error;
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

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
