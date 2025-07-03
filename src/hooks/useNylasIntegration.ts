
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

interface NylasConnection {
  id: string;
  grant_id?: string;
  email: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  calendar_ids?: string[];
  connector_id?: string;
  grant_status?: string;
  scopes?: string[];
  last_sync_at?: string;
}

interface NylasCalendar {
  id: string;
  name: string;
  isPrimary: boolean;
  readOnly: boolean;
}

export const useNylasIntegration = () => {
  const [connections, setConnections] = useState<NylasConnection[]>([]);
  const [calendars, setCalendars] = useState<NylasCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [infrastructureError, setInfrastructureError] = useState<string | null>(null);
  const { toast } = useToast();
  const { userId, authInitialized } = useUser();

  // Temporarily disable all Nylas functionality due to browser compatibility issues
  const fetchConnections = async () => {
    console.log('[useNylasIntegration] Nylas integration disabled due to browser compatibility issues');
    setConnections([]);
    setIsLoading(false);
    setInfrastructureError(null);
  };

  const fetchCalendars = async () => {
    console.log('[useNylasIntegration] Nylas calendars disabled due to browser compatibility issues');
    setCalendars([]);
  };

  const connectGoogleCalendar = async () => {
    toast({
      title: 'Feature Temporarily Disabled',
      description: 'Calendar integration is temporarily disabled due to technical issues.',
      variant: 'destructive'
    });
  };

  const disconnectCalendar = async (connectionId: string) => {
    toast({
      title: 'Feature Temporarily Disabled', 
      description: 'Calendar integration is temporarily disabled due to technical issues.',
      variant: 'destructive'
    });
  };

  useEffect(() => {
    if (authInitialized && userId) {
      fetchConnections();
    }
  }, [authInitialized, userId]);

  return {
    connections,
    calendars,
    isLoading,
    isConnecting,
    infrastructureError,
    connectCalendar: connectGoogleCalendar,
    connectGoogleCalendar,
    disconnectCalendar,
    refreshConnections: fetchConnections,
    fetchCalendars
  };
};
