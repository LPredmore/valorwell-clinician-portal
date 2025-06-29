
import React, { useMemo, useState, useEffect } from 'react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { useNylasEvents } from '@/hooks/useNylasEvents';
import { Calendar, ExternalLink, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import CalendarLoadingState from './CalendarLoadingState';
import CalendarErrorState from './CalendarErrorState';

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
  const { connections, isLoading: isLoadingConnections, connectCalendar } = useNylasIntegration();
  
  // CRITICAL FIX: Use SYNCHRONIZED date range calculation - identical to CalendarSimple
  const startDate = useMemo(() => {
    const start = startOfWeek(currentDate);
    console.log('[NylasHybridCalendar] SYNCHRONIZED start date calculated:', {
      currentDate: currentDate.toISOString(),
      startDate: start.toISOString(),
      startDateLocal: start.toLocaleString(),
      synchronizationMethod: 'date-fns startOfWeek - SAME as CalendarSimple'
    });
    return start;
  }, [currentDate]);
  
  const endDate = useMemo(() => {
    const end = endOfWeek(currentDate);
    console.log('[NylasHybridCalendar] SYNCHRONIZED end date calculated:', {
      currentDate: currentDate.toISOString(),
      endDate: end.toISOString(),
      endDateLocal: end.toLocaleString(),
      synchronizationMethod: 'date-fns endOfWeek - SAME as CalendarSimple'
    });
    return end;
  }, [currentDate]);
  
  // Date Range Synchronization Verification
  useEffect(() => {
    console.log('[NylasHybridCalendar] Date Range Synchronization Check:', {
      componentName: 'NylasHybridCalendar',
      calculatedStartDate: startDate.toISOString(),
      calculatedEndDate: endDate.toISOString(),
      currentDate: currentDate.toISOString(),
      synchronizationMethod: 'Using SAME date-fns functions as CalendarSimple',
      shouldMatchCalendarSimple: true
    });
  }, [startDate, endDate, currentDate]);
  
  const { 
    events, 
    isLoading: isLoadingEvents, 
    error,
    refetch 
  } = useNylasEvents(startDate, endDate); // SYNCHRONIZED dates

  const isLoading = isLoadingConnections || isLoadingEvents;

  // Generate week days for the calendar grid
  const weekDays = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    console.log('[NylasHybridCalendar] Generated week days with SYNCHRONIZED dates:', {
      daysCount: days.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      days: days.map(d => ({ iso: d.toISOString(), local: d.toLocaleDateString() })),
      synchronizationNote: 'Week days generated using SAME date range as events fetch'
    });
    return days;
  }, [startDate, endDate]);

  // Group events by date for calendar display
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    console.log('[NylasHybridCalendar] Grouping events by date with SYNCHRONIZED range - input events:', events);
    
    events.forEach(event => {
      if (event.when?.start_time) {
        const eventStartTime = new Date(event.when.start_time);
        const dateKey = format(eventStartTime, 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        
        grouped[dateKey].push(event);
        
        console.log('[NylasHybridCalendar] Grouped event with SYNCHRONIZED dates:', {
          eventId: event.id,
          eventTitle: event.title,
          startTime: event.when.start_time,
          eventStartTime: eventStartTime.toISOString(),
          dateKey,
          groupedCount: grouped[dateKey].length,
          synchronizedDateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        });
      } else {
        console.warn('[NylasHybridCalendar] Event missing start_time:', event);
      }
    });
    
    console.log('[NylasHybridCalendar] Final grouped events with SYNCHRONIZED dates:', {
      totalGroups: Object.keys(grouped).length,
      grouped,
      eventsByDateSummary: Object.entries(grouped).map(([date, events]) => ({
        date,
        eventCount: events.length,
        eventTitles: events.map(e => e.title)
      })),
      synchronizedDateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      synchronizationStatus: 'SUCCESS - Events grouped using SAME date boundaries'
    });
    
    return grouped;
  }, [events, startDate, endDate]);

  // Debug effect to log all component state changes
  useEffect(() => {
    console.log('[NylasHybridCalendar] Component state updated with SYNCHRONIZED dates:', {
      clinicianId,
      userTimeZone,
      currentDate: currentDate.toISOString(),
      synchronizedStartDate: startDate.toISOString(),
      synchronizedEndDate: endDate.toISOString(),
      connectionsCount: connections.length,
      eventsCount: events.length,
      isLoadingConnections,
      isLoadingEvents,
      isLoading,
      error,
      weekDaysCount: weekDays.length,
      eventsByDateKeys: Object.keys(eventsByDate),
      eventsByDateCount: Object.values(eventsByDate).reduce((sum, events) => sum + events.length, 0),
      dateRangeSynchronization: 'SYNCHRONIZED with CalendarSimple'
    });
  }, [clinicianId, userTimeZone, currentDate, startDate, endDate, connections, events, isLoadingConnections, isLoadingEvents, isLoading, error, weekDays, eventsByDate]);

  const handleConnectCalendar = async () => {
    try {
      console.log('[NylasHybridCalendar] Connecting calendar...');
      await connectCalendar();
      console.log('[NylasHybridCalendar] Calendar connection initiated');
    } catch (error) {
      console.error('[NylasHybridCalendar] Error connecting calendar:', error);
    }
  };

  // Show error state for database/deployment issues
  if (error && (error.includes('does not exist') || error.includes('Failed to send a request'))) {
    console.log('[NylasHybridCalendar] Showing setup required error state');
    return (
      <CalendarErrorState
        title="Setup Required"
        message="Nylas integration requires database migration and edge function deployment."
        onRetry={refetch}
        showRetry={false}
      />
    );
  }

  // Show error state for other errors
  if (error) {
    console.log('[NylasHybridCalendar] Showing general error state:', error);
    return (
      <CalendarErrorState
        message={`Error loading calendar events: ${error}`}
        onRetry={refetch}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    console.log('[NylasHybridCalendar] Showing loading state');
    return <CalendarLoadingState message="Loading calendar events..." />;
  }

  // Show connect calendar prompt if no connections
  if (!connections.length) {
    console.log('[NylasHybridCalendar] Showing connect calendar prompt - no connections');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your external calendars to manage all your appointments in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No calendars connected</h3>
            <p className="text-gray-500 mb-6">
              Connect Google Calendar, Outlook, or other calendar providers to see all your events
            </p>
            <Button onClick={handleConnectCalendar} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Connect Calendar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('[NylasHybridCalendar] Rendering hybrid calendar with SYNCHRONIZED data');

  return (
    <div className="space-y-6">
      {/* Connected calendars summary */}
      <div className="flex flex-wrap gap-2">
        {connections.map((conn) => (
          <Badge key={conn.id} variant="secondary" className="text-xs">
            {conn.provider}: {conn.email}
          </Badge>
        ))}
        <Button onClick={handleConnectCalendar} variant="outline" size="sm" className="ml-2">
          <Plus className="h-3 w-3 mr-1" />
          Add Calendar
        </Button>
      </div>

      {/* Week view calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-3 text-center border-r last:border-r-0">
              <div className="font-medium text-sm">{format(day, 'EEE')}</div>
              <div className="text-lg">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Events grid */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateKey] || [];
            
            console.log('[NylasHybridCalendar] Rendering day with SYNCHRONIZED dates:', {
              day: day.toISOString(),
              dayLocal: day.toLocaleDateString(),
              dateKey,
              dayEventsCount: dayEvents.length,
              dayEvents,
              synchronizedDateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
              }
            });
            
            return (
              <div key={day.toISOString()} className="border-r last:border-r-0 p-2 min-h-[400px]">
                <div className="space-y-1">
                  {dayEvents.length === 0 ? (
                    <div className="text-xs text-gray-400 p-2">
                      No events
                    </div>
                  ) : (
                    dayEvents.map((event) => {
                      console.log('[NylasHybridCalendar] Rendering event with SYNCHRONIZED context:', {
                        eventId: event.id,
                        eventTitle: event.title,
                        eventStartTime: event.when?.start_time,
                        synchronizedDateRange: {
                          start: startDate.toISOString(),
                          end: endDate.toISOString()
                        }
                      });
                      
                      return (
                        <div
                          key={event.id}
                          className="p-2 bg-blue-100 border-l-4 border-blue-500 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                          onClick={() => onEventClick?.(event)}
                        >
                          <div className="font-medium text-blue-900 truncate">
                            {event.title || 'Untitled Event'}
                          </div>
                          {event.when?.start_time && (
                            <div className="text-blue-700">
                              {format(new Date(event.when.start_time), 'h:mm a')}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {event.connection_provider}
                            </Badge>
                            <ExternalLink className="h-3 w-3 text-blue-500" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Events summary */}
      <div className="text-sm text-gray-600">
        Showing {events.length} events from {connections.length} connected calendar{connections.length !== 1 ? 's' : ''}
        {events.length === 0 && connections.length > 0 && (
          <div className="text-yellow-600 mt-1">
            ⚠️ No events found for the current week. Check your calendar for events in this date range.
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          📅 Date Range: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()} (SYNCHRONIZED)
        </div>
      </div>
    </div>
  );
};

export default NylasHybridCalendar;
