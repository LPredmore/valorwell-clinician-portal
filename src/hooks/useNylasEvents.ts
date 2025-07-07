
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

      console.log('[useNylasEvents] SYNCHRONIZED date range fetch with parameters:', {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        startDateLocal: startDate?.toLocaleString(),
        endDateLocal: endDate?.toLocaleString(),
        synchronizationStatus: 'Using SAME date range as useAppointments'
      });

      const requestBody = {
        action: 'fetch_events',
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      };

      console.log('[useNylasEvents] SYNCHRONIZED request body to nylas-events function:', requestBody);

      const { data, error } = await supabase.functions.invoke('nylas-events', {
        body: requestBody
      });

      console.log('[useNylasEvents] Function response for SYNCHRONIZED date range:', { data, error });

      if (error) {
        console.error('[useNylasEvents] Function error:', error);
        throw error;
      }

      const fetchedEvents = data?.events || [];
      const fetchedConnections = data?.connections || [];

      // Add detailed logging for event data verification
      console.log('[useNylasEvents] Nylas events date range verification:', {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        totalEvents: fetchedEvents.length,
        eventDates: fetchedEvents.map((e: any) => ({
          title: e.title,
          when: e.when,
          start_time: e.when?.start_time,
          date: e.when?.date,
          object_type: e.when?.object
        }))
      });

      console.log('[useNylasEvents] SYNCHRONIZED response processed:', {
        eventsCount: fetchedEvents.length,
        connectionsCount: fetchedConnections.length,
        dateRangeUsed: {
          start: startDate?.toISOString(),
          end: endDate?.toISOString()
        },
        events: fetchedEvents,
        connections: fetchedConnections.map((conn: any) => ({
          id: conn.id,
          grant_id: conn.grant_id,
          email: conn.email,
          provider: conn.provider
        })),
        synchronizationNote: 'This hook now uses IDENTICAL date ranges as useAppointments'
      });

      setEvents(fetchedEvents);
      setConnections(fetchedConnections);
    } catch (error) {
      console.error('[useNylasEvents] Error fetching Nylas events with SYNCHRONIZED dates:', error);
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
    console.log('[useNylasEvents] Effect triggered with SYNCHRONIZED dates:', {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      synchronizationStatus: 'MATCHED with useAppointments date range'
    });
    fetchEvents();
  }, [startDate, endDate]);

  useEffect(() => {
    console.log('[useNylasEvents] State updated with SYNCHRONIZED data:', {
      eventsCount: events.length,
      connectionsCount: connections.length,
      isLoading,
      error,
      dateRangeUsed: {
        start: startDate?.toISOString(),
        end: endDate?.toISOString()
      },
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        start_time: e.when?.start_time,
        connection_email: e.connection_email,
        connection_provider: e.connection_provider
      })),
      synchronizationStatus: 'SUCCESS - Using same date boundaries as internal appointments'
    });
  }, [events, connections, isLoading, error, startDate, endDate]);

  return {
    events,
    connections,
    isLoading,
    error,
    refetch: fetchEvents
  };
};
