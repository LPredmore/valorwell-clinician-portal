
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

      console.log('[useNylasEvents] Fetching events with parameters:', {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        startDateLocal: startDate?.toLocaleString(),
        endDateLocal: endDate?.toLocaleString()
      });

      const requestBody = {
        action: 'fetch_events',
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      };

      console.log('[useNylasEvents] Calling nylas-events function with body:', requestBody);

      const { data, error } = await supabase.functions.invoke('nylas-events', {
        body: requestBody
      });

      console.log('[useNylasEvents] Function response:', { data, error });

      if (error) {
        console.error('[useNylasEvents] Function error:', error);
        throw error;
      }

      const fetchedEvents = data?.events || [];
      const fetchedConnections = data?.connections || [];

      console.log('[useNylasEvents] Processed response:', {
        eventsCount: fetchedEvents.length,
        connectionsCount: fetchedConnections.length,
        events: fetchedEvents,
        connections: fetchedConnections.map((conn: any) => ({
          id: conn.id,
          grant_id: conn.grant_id,
          email: conn.email,
          provider: conn.provider
        }))
      });

      setEvents(fetchedEvents);
      setConnections(fetchedConnections);
    } catch (error) {
      console.error('[useNylasEvents] Error fetching Nylas events:', error);
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
    console.log('[useNylasEvents] Effect triggered with dates:', {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString()
    });
    fetchEvents();
  }, [startDate, endDate]);

  useEffect(() => {
    console.log('[useNylasEvents] State updated:', {
      eventsCount: events.length,
      connectionsCount: connections.length,
      isLoading,
      error,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        start_time: e.when?.start_time,
        connection_email: e.connection_email,
        connection_provider: e.connection_provider
      }))
    });
  }, [events, connections, isLoading, error]);

  return {
    events,
    connections,
    isLoading,
    error,
    refetch: fetchEvents
  };
};
