
import { useState, useEffect, useMemo } from 'react';
import { useNylasClient } from './useNylasClient';
import { useToast } from '@/hooks/use-toast';
import { useNylasIntegration } from './useNylasIntegration';

interface NylasEvent {
  id: string;
  title: string;
  description?: string;
  when: {
    start_time: string;
    end_time: string;
    start_timezone?: string;
    end_timezone?: string;
  };
  connection_id: string;
  connection_email: string;
  connection_provider: string;
  calendar_id: string;
  calendar_name: string;
  status?: string;
  location?: string;
}

export const useNylasEvents = (startDate?: Date, endDate?: Date) => {
  const nylasClient = useNylasClient();
  const { connections } = useNylasIntegration();
  const [events, setEvents] = useState<NylasEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Convert Date objects to stable string representations
  const startDateISO = useMemo(() => startDate?.toISOString(), [startDate?.getTime()]);
  const endDateISO = useMemo(() => endDate?.toISOString(), [endDate?.getTime()]);

  const fetchEvents = async () => {
    // Temporarily disable Nylas events due to SDK compatibility issues
    console.log('[useNylasEvents] Nylas events disabled due to browser compatibility issues');
    setEvents([]);
    setIsLoading(false);
    setError(null);
    return;
  };

  useEffect(() => {
    console.log('[useNylasEvents] Effect triggered - Nylas events temporarily disabled');
    fetchEvents();
  }, [nylasClient, connections.length, startDateISO, endDateISO]);

  return {
    events,
    connections,
    isLoading,
    error,
    refetch: fetchEvents
  };
};
