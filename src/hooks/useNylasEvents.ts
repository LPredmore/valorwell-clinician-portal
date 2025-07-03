
import { useState, useEffect, useMemo } from 'react';
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

  // Convert Date objects to stable string representations to prevent infinite loops
  const startDateISO = useMemo(() => startDate?.toISOString(), [startDate?.getTime()]);
  const endDateISO = useMemo(() => endDate?.toISOString(), [endDate?.getTime()]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useNylasEvents] ENHANCED: Fetching events with stabilized parameters:', {
        startDateISO,
        endDateISO,
        stabilized: true
      });

      const requestBody = {
        action: 'fetch_events',
        startDate: startDateISO,
        endDate: endDateISO
      };

      console.log('[useNylasEvents] ENHANCED: Request body to nylas-events function:', requestBody);

      const { data, error } = await supabase.functions.invoke('nylas-events', {
        body: requestBody
      });

      console.log('[useNylasEvents] ENHANCED: Function response:', { data, error });

      if (error) {
        console.error('[useNylasEvents] Function error:', error);
        throw error;
      }

      const fetchedEvents = data?.events || [];
      const fetchedConnections = data?.connections || [];

      // Enhanced logging for event data verification
      console.log('[useNylasEvents] ENHANCED: Events fetched with date range verification:', {
        startDateISO,
        endDateISO,
        totalEvents: fetchedEvents.length,
        eventSample: fetchedEvents.slice(0, 3).map((e: any) => ({
          title: e.title,
          start_time: e.when?.start_time,
          connection_email: e.connection_email
        }))
      });

      setEvents(fetchedEvents);
      setConnections(fetchedConnections);
    } catch (error) {
      console.error('[useNylasEvents] ENHANCED: Error fetching Nylas events:', error);
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

  // Use stabilized string dependencies instead of Date objects
  useEffect(() => {
    console.log('[useNylasEvents] ENHANCED: Effect triggered with stabilized dates:', {
      startDateISO,
      endDateISO,
      stabilized: true
    });
    fetchEvents();
  }, [startDateISO, endDateISO]);

  useEffect(() => {
    console.log('[useNylasEvents] ENHANCED: State updated with stabilized data:', {
      eventsCount: events.length,
      connectionsCount: connections.length,
      isLoading,
      error,
      dateRangeUsed: {
        startDateISO,
        endDateISO
      },
      eventsSample: events.slice(0, 3).map(e => ({
        id: e.id,
        title: e.title,
        start_time: e.when?.start_time
      }))
    });
  }, [events, connections, isLoading, error, startDateISO, endDateISO]);

  return {
    events,
    connections,
    isLoading,
    error,
    refetch: fetchEvents
  };
};
