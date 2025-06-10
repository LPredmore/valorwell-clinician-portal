
import React, { useMemo } from 'react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { useNylasEvents } from '@/hooks/useNylasEvents';
import { Loader2, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { addWeeks, subWeeks, format } from 'date-fns';

interface NylasHybridCalendarProps {
  clinicianId: string | null;
  userTimeZone: string;
  currentDate: Date;
  onEventClick?: (event: any) => void;
}

const NylasHybridCalendar: React.FC<NylasHybridCalendarProps> = ({
  clinicianId,
  userTimeZone,
  currentDate,
  onEventClick,
}) => {
  const { connections, isLoading: isLoadingConnections } = useNylasIntegration();
  
  // Calculate date range for fetching events (current week)
  const startDate = useMemo(() => subWeeks(currentDate, 1), [currentDate]);
  const endDate = useMemo(() => addWeeks(currentDate, 2), [currentDate]);
  
  const { 
    events, 
    isLoading: isLoadingEvents, 
    error,
    refetch 
  } = useNylasEvents(startDate, endDate);

  const isLoading = isLoadingConnections || isLoadingEvents;

  // Group events by date for better display
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    events.forEach(event => {
      const startTime = new Date(event.when.start_time);
      const dateKey = format(startTime, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(event);
    });
    
    return grouped;
  }, [events]);

  if (!connections.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            External Calendar Events
          </CardTitle>
          <CardDescription>
            Connect external calendars to view events here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No calendars connected</p>
            <p className="text-sm">Connect a calendar to view external events</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            External Calendar Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading external events...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Calendar className="h-5 w-5" />
            External Calendar Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-red-600">
            <p>Error loading external events</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          External Calendar Events
        </CardTitle>
        <CardDescription>
          Events from your connected calendars ({events.length} events found)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Connected calendars summary */}
          <div className="flex flex-wrap gap-2 mb-4">
            {connections.map((conn) => (
              <Badge key={conn.id} variant="secondary" className="text-xs">
                {conn.provider}: {conn.email}
              </Badge>
            ))}
          </div>

          {/* Events list */}
          {events.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No external events in this time period</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(eventsByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dateEvents]) => (
                  <div key={date} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">
                      {format(new Date(date), 'EEEE, MMM d')}
                    </h4>
                    {dateEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{event.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {format(new Date(event.when.start_time), 'h:mm a')} - {' '}
                              {format(new Date(event.when.end_time), 'h:mm a')}
                            </div>
                            {event.description && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {event.description}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {event.connection_provider}
                              </Badge>
                              {event.calendar_name && (
                                <Badge variant="outline" className="text-xs">
                                  {event.calendar_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="h-3 w-3 text-gray-400 ml-2 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NylasHybridCalendar;
