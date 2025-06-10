
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [events, setEvents] = useState<NylasEvent[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const requestBody = {
        action: 'fetch_events',
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      };

      const { data, error } = await supabase.functions.invoke('nylas-events', {
        body: requestBody
      });

      if (error) throw error;

      setEvents(data?.events || []);
      setConnections(data?.connections || []);
    } catch (error) {
      console.error('Error fetching Nylas events:', error);
      setError(error.message || 'Failed to fetch calendar events');
      toast({
        title: "Error",
        description: "Failed to load external calendar events",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [startDate, endDate]);

  return {
    events,
    connections,
    isLoading,
    error,
    refetch: fetchEvents
  };
};
