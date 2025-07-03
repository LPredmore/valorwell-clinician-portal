
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
    if (!nylasClient || !connections.length || !startDate || !endDate) {
      console.log('[useNylasEvents] Missing requirements:', {
        hasClient: !!nylasClient,
        connectionCount: connections.length,
        hasDateRange: !!(startDate && endDate)
      });
      setEvents([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useNylasEvents] Fetching events with Nylas SDK v7:', {
        startDateISO,
        endDateISO,
        connectionCount: connections.length
      });

      const allEvents: NylasEvent[] = [];

      for (const connection of connections) {
        try {
          console.log(`[useNylasEvents] Processing connection: ${connection.id} (${connection.email})`);
          
          // Use grant_id as identifier for v7 SDK
          const grantId = connection.grant_id || connection.id;
          
          // First get calendars for this connection
          const calendarsResponse = await nylasClient.calendars.list({
            identifier: grantId
          });

          const calendars = calendarsResponse.data || [];
          console.log(`[useNylasEvents] Found ${calendars.length} calendars for connection ${connection.id}`);

          // Get primary calendar or all calendars
          const calendarsToFetch = calendars.filter(cal => cal.isPrimary) || calendars.slice(0, 1);

          for (const calendar of calendarsToFetch) {
            console.log(`[useNylasEvents] Fetching events for calendar: ${calendar.id} (${calendar.name})`);
            
            const eventsResponse = await nylasClient.events.list({
              identifier: grantId,
              queryParams: {
                calendar_id: calendar.id,
                starts_after: Math.floor(startDate.getTime() / 1000),
                ends_before: Math.floor(endDate.getTime() / 1000),
                limit: 50,
                expand_recurring: false
              }
            });

            const fetchedEvents = eventsResponse.data || [];
            console.log(`[useNylasEvents] Fetched ${fetchedEvents.length} events from calendar ${calendar.id}`);

            // Transform and filter events (busy events only)
            const transformedEvents = fetchedEvents
              .filter(event => {
                // Only include non-all-day events for busy sync
                return event.when && 
                       event.when.object === 'timespan' && 
                       event.when.startTime && 
                       event.when.endTime;
              })
              .map(event => ({
                id: event.id,
                title: event.title || 'Busy',
                description: event.description || '',
                when: {
                  start_time: new Date(event.when.startTime * 1000).toISOString(),
                  end_time: new Date(event.when.endTime * 1000).toISOString(),
                  start_timezone: event.when.startTimezone || 'America/New_York',
                  end_timezone: event.when.endTimezone || 'America/New_York'
                },
                connection_id: connection.id,
                connection_email: connection.email,
                connection_provider: connection.provider,
                calendar_id: calendar.id,
                calendar_name: calendar.name || 'Calendar',
                status: event.status,
                location: event.location,
                participants: event.participants || []
              }));

            allEvents.push(...transformedEvents);
          }
        } catch (connectionError) {
          console.error(`[useNylasEvents] Error processing connection ${connection.id}:`, connectionError);
          continue;
        }
      }

      console.log(`[useNylasEvents] Total events fetched: ${allEvents.length}`);
      setEvents(allEvents);

    } catch (error) {
      console.error('[useNylasEvents] Error fetching events with SDK:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch calendar events');
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
    console.log('[useNylasEvents] Effect triggered:', {
      hasClient: !!nylasClient,
      connectionCount: connections.length,
      startDateISO,
      endDateISO
    });
    
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
