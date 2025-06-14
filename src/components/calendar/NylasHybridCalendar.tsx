import React, { useMemo, useState } from 'react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { useNylasEvents } from '@/hooks/useNylasEvents';
import { Calendar, ExternalLink, Plus, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import VirtualCalendar from './VirtualCalendar';
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
  const { connections, isLoading: isLoadingConnections, connectGoogleCalendar } = useNylasIntegration();
  const [showExternalOverlay, setShowExternalOverlay] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Calculate date range for fetching external events (current week)
  const startDate = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const endDate = useMemo(() => endOfWeek(currentDate), [currentDate]);
  
  const { 
    events, 
    isLoading: isLoadingEvents, 
    error: eventsError,
  } = useNylasEvents(startDate, endDate);

  const handleNewAppointment = (date: Date, time?: string) => {
    console.log('New appointment requested for:', date, time);
    // TODO: Open appointment creation dialog
  };

  const handleAppointmentClick = (appointment: any) => {
    console.log('Appointment clicked:', appointment);
    onEventClick?.(appointment);
  };

  const handleAvailabilityUpdated = () => {
    console.log('Availability updated, refreshing hybrid calendar view...');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleConnectCalendar = async () => {
    try {
      await connectGoogleCalendar();
    } catch (error) {
      console.error('Error connecting calendar:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* External Calendars Header */}
      {connections.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium">Connected calendars:</span>
            {connections.map((conn) => (
              <Badge key={conn.id} variant="secondary" className="text-xs">
                {conn.provider}: {conn.email}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowExternalOverlay(!showExternalOverlay)} 
              variant="outline" 
              size="sm"
            >
              <Settings className="h-3 w-3 mr-1" />
              {showExternalOverlay ? 'Hide' : 'Show'} External
            </Button>
            <Button onClick={handleConnectCalendar} variant="outline" size="sm">
              <Plus className="h-3 w-3 mr-1" />
              Add Calendar
            </Button>
          </div>
        </div>
      )}

      {/* No external calendars - show connect option */}
      {connections.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Connect External Calendars</h4>
              <p className="text-sm text-blue-700">
                Connect Google Calendar, Outlook, or other providers to see external events alongside your appointments
              </p>
            </div>
            <Button onClick={handleConnectCalendar} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Connect Calendar
            </Button>
          </div>
        </div>
      )}

      {/* Main Virtual Calendar - Always Shows */}
      <VirtualCalendar
        clinicianId={clinicianId}
        currentDate={currentDate}
        userTimeZone={userTimeZone}
        onNewAppointment={handleNewAppointment}
        onAppointmentClick={handleAppointmentClick}
        refreshTrigger={refreshTrigger}
        onAvailabilityUpdated={handleAvailabilityUpdated}
      />

      {/* External Events Overlay */}
      {connections.length > 0 && showExternalOverlay && events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              External Calendar Events
            </CardTitle>
            <CardDescription>
              Events from your connected external calendars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm cursor-pointer hover:bg-orange-100 transition-colors"
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="font-medium text-orange-900 truncate">
                    {event.title || 'Untitled Event'}
                  </div>
                  {event.when?.start_time && (
                    <div className="text-orange-700 text-xs">
                      {format(new Date(event.when.start_time), 'MMM d, h:mm a')}
                      {event.when.end_time && (
                        <span> - {format(new Date(event.when.end_time), 'h:mm a')}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {event.connection_provider}
                    </Badge>
                    <ExternalLink className="h-3 w-3 text-orange-500" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state for external events */}
      {isLoadingEvents && connections.length > 0 && (
        <div className="text-center py-4">
          <div className="text-sm text-gray-500">Loading external calendar events...</div>
        </div>
      )}

      {/* Error state for external events */}
      {eventsError && connections.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">
            Note: External calendar events could not be loaded. Your internal appointments are still available above.
          </div>
        </div>
      )}
    </div>
  );
};

export default NylasHybridCalendar;
