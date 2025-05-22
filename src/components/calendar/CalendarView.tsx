
import React, { useEffect, useState } from 'react';
import WeekView from './week-view';
import MonthView from './MonthView';
import { Appointment } from '@/types/appointment';
import { SyncedEvent } from '@/hooks/useGoogleCalendar';
import { supabase } from '@/integrations/supabase/client';

interface CalendarViewProps {
  view: 'week' | 'month';
  showAvailability: boolean;
  clinicianId: string | null;
  currentDate: Date;
  userTimeZone: string;
  refreshTrigger: number;
  appointments?: Appointment[];
  isLoading?: boolean;
  error?: Error | null;
}

const CalendarView = ({
  view = 'week',
  showAvailability = true,
  clinicianId,
  currentDate,
  userTimeZone,
  refreshTrigger = 0,
  appointments = [],
  isLoading = false,
  error = null
}: CalendarViewProps) => {
  // State for synced events
  const [syncedEvents, setSyncedEvents] = useState<SyncedEvent[]>([]);
  const [loadingSyncedEvents, setLoadingSyncedEvents] = useState(false);

  // Combined appointments and synced events for display
  const [combinedEvents, setCombinedEvents] = useState<Appointment[]>(appointments);
  
  // Fetch synced events from our new table
  useEffect(() => {
    const fetchSyncedEvents = async () => {
      if (!clinicianId) return;
      
      setLoadingSyncedEvents(true);
      try {
        // Calculate date range for fetching synced events (same as for appointments)
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 30); // 1 month before
        
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 60); // 2 months ahead
        
        const { data, error } = await supabase
          .from('synced_events')
          .select('*')
          .eq('clinician_id', clinicianId)
          .eq('is_visible', true)
          .gte('start_at', startDate.toISOString())
          .lte('end_at', endDate.toISOString());
          
        if (error) {
          console.error('[CalendarView] Error fetching synced events:', error);
          return;
        }
        
        console.log(`[CalendarView] Fetched ${data?.length || 0} synced events`);
        setSyncedEvents(data || []);
      } catch (err) {
        console.error('[CalendarView] Error in fetchSyncedEvents:', err);
      } finally {
        setLoadingSyncedEvents(false);
      }
    };
    
    fetchSyncedEvents();
  }, [clinicianId, currentDate, refreshTrigger]);
  
  // Combine regular appointments and synced events
  useEffect(() => {
    // Convert synced events to appointment format for display
    const syncedEventsAsAppointments: Appointment[] = syncedEvents.map(event => ({
      id: `synced-${event.id}`,
      clinician_id: event.clinician_id,
      client_id: null,
      start_at: event.start_at,
      end_at: event.end_at,
      type: 'personal', // Mark as personal event type
      status: 'scheduled',
      notes: event.original_description || '',
      clientName: event.display_title,
      google_calendar_event_id: event.google_calendar_event_id,
      last_synced_at: event.last_synced_at,
      isPersonalEvent: true // Flag to identify synced events
    }));
    
    // Create combined array of regular appointments and synced events
    const combined = [...appointments, ...syncedEventsAsAppointments];
    setCombinedEvents(combined);
    
    console.log('[CalendarView] Rendering with', appointments.length, 'appointments and', 
      syncedEventsAsAppointments.length, 'personal events for clinician', clinicianId);
    console.log('[CalendarView] Calendar view:', view, 'timezone:', userTimeZone, 'refreshTrigger:', refreshTrigger);
    
  }, [appointments, syncedEvents, clinicianId, view, userTimeZone, refreshTrigger]);

  const getClientName = (clientId: string) => {
    // Find a matching appointment and return its client name
    const appointment = appointments.find(app => app.client_id === clientId);
    return appointment ? appointment.clientName || 'Unknown Client' : 'Unknown Client';
  };

  return (
    <>
      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          clinicianId={clinicianId}
          showAvailability={showAvailability}
          refreshTrigger={refreshTrigger}
          appointments={combinedEvents}
          isLoading={isLoading || loadingSyncedEvents}
          error={error}
          userTimeZone={userTimeZone}
        />
      )}
      
      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          clinicianId={clinicianId}
          refreshTrigger={refreshTrigger}
          appointments={combinedEvents}
          getClientName={getClientName}
          userTimeZone={userTimeZone}
        />
      )}
    </>
  );
};

export default CalendarView;
