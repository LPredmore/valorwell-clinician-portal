
import React, { useMemo, useState } from 'react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { useNylasEvents } from '@/hooks/useNylasEvents';
import { Loader2, Calendar, ExternalLink, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { addWeeks, subWeeks, format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

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
  
  // Calculate date range for fetching events (current week)
  const startDate = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const endDate = useMemo(() => endOfWeek(currentDate), [currentDate]);
  
  const { 
    events, 
    isLoading: isLoadingEvents, 
    error,
    refetch 
  } = useNylasEvents(startDate, endDate);

  const isLoading = isLoadingConnections || isLoadingEvents;

  // Generate week days for the calendar grid
  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  // Group events by date for calendar display
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    events.forEach(event => {
      const eventStartTime = new Date(event.when.start_time);
      const dateKey = format(eventStartTime, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(event);
    });
    
    return grouped;
  }, [events]);

  const handleConnectCalendar = async () => {
    try {
      await connectCalendar();
    } catch (error) {
      console.error('Error connecting calendar:', error);
    }
  };

  if (!connections.length) {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading calendar events...</p>
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
            Calendar Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <p>Error loading calendar events</p>
            <p className="text-sm mt-2">{error}</p>
            <Button onClick={refetch} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            
            return (
              <div key={day.toISOString()} className="border-r last:border-r-0 p-2 min-h-[400px]">
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-2 bg-blue-100 border-l-4 border-blue-500 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="font-medium text-blue-900 truncate">
                        {event.title}
                      </div>
                      <div className="text-blue-700">
                        {format(new Date(event.when.start_time), 'h:mm a')}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {event.connection_provider}
                        </Badge>
                        <ExternalLink className="h-3 w-3 text-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Events summary */}
      <div className="text-sm text-gray-600">
        Showing {events.length} events from {connections.length} connected calendar{connections.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default NylasHybridCalendar;
