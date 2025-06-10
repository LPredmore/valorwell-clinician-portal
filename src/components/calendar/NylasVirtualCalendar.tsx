
import React, { useEffect, useRef, useState } from 'react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface NylasVirtualCalendarProps {
  clinicianId: string | null;
  userTimeZone: string;
  onEventClick?: (event: any) => void;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (event: any) => void;
  onEventDelete?: (event: any) => void;
}

const NylasVirtualCalendar: React.FC<NylasVirtualCalendarProps> = ({
  clinicianId,
  userTimeZone,
  onEventClick,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
}) => {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connections } = useNylasIntegration();
  const { toast } = useToast();

  useEffect(() => {
    if (!connections.length || !clinicianId) {
      setIsLoading(false);
      return;
    }

    const initializeVirtualCalendar = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Nylas SDK dynamically
        const nylasScript = document.createElement('script');
        nylasScript.src = 'https://sdk.nylas.com/sdk.js';
        nylasScript.onload = () => {
          initializeCalendar();
        };
        document.head.appendChild(nylasScript);

      } catch (err) {
        console.error('Error initializing Nylas Virtual Calendar:', err);
        setError('Failed to load calendar');
        setIsLoading(false);
      }
    };

    const initializeCalendar = () => {
      if (!window.Nylas || !calendarRef.current) return;

      try {
        // Initialize the Virtual Calendar
        const calendar = window.Nylas.calendar({
          element: calendarRef.current,
          calendar_ids: connections.map(conn => conn.calendar_ids || []).flat(),
          theme: 'light',
          timezone: userTimeZone,
          view: 'week',
          event_handlers: {
            onEventClick: (event: any) => {
              console.log('Nylas event clicked:', event);
              if (onEventClick) onEventClick(event);
            },
            onEventCreate: (event: any) => {
              console.log('Nylas event created:', event);
              if (onEventCreate) onEventCreate(event);
              syncToSupabase(event, 'create');
            },
            onEventUpdate: (event: any) => {
              console.log('Nylas event updated:', event);
              if (onEventUpdate) onEventUpdate(event);
              syncToSupabase(event, 'update');
            },
            onEventDelete: (event: any) => {
              console.log('Nylas event deleted:', event);
              if (onEventDelete) onEventDelete(event);
              syncToSupabase(event, 'delete');
            },
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error creating calendar instance:', err);
        setError('Failed to initialize calendar');
        setIsLoading(false);
      }
    };

    const syncToSupabase = async (event: any, action: string) => {
      try {
        // Sync Nylas events back to Supabase
        const { supabase } = await import('@/integrations/supabase/client');
        
        switch (action) {
          case 'create':
            // Create new appointment in Supabase
            await supabase.from('appointments').insert({
              clinician_id: clinicianId,
              start_at: event.when.start_time,
              end_at: event.when.end_time,
              type: 'appointment',
              status: 'scheduled',
              notes: event.description,
              appointment_timezone: userTimeZone,
            });
            break;
          case 'update':
            // Update existing appointment
            await supabase
              .from('external_calendar_mappings')
              .select('appointment_id')
              .eq('external_event_id', event.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  return supabase
                    .from('appointments')
                    .update({
                      start_at: event.when.start_time,
                      end_at: event.when.end_time,
                      notes: event.description,
                    })
                    .eq('id', data.appointment_id);
                }
              });
            break;
          case 'delete':
            // Mark appointment as cancelled
            await supabase
              .from('external_calendar_mappings')
              .select('appointment_id')
              .eq('external_event_id', event.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  return supabase
                    .from('appointments')
                    .update({ status: 'cancelled' })
                    .eq('id', data.appointment_id);
                }
              });
            break;
        }

        toast({
          title: "Calendar Synced",
          description: `Calendar ${action} synced successfully`,
        });
      } catch (error) {
        console.error('Sync error:', error);
        toast({
          title: "Sync Failed",
          description: `Failed to sync ${action} to database`,
          variant: "destructive",
        });
      }
    };

    initializeVirtualCalendar();

    return () => {
      // Cleanup
      if (calendarRef.current) {
        calendarRef.current.innerHTML = '';
      }
    };
  }, [connections, clinicianId, userTimeZone]);

  if (!connections.length) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No calendars connected</p>
          <p className="text-sm text-gray-500">Connect a calendar to view events</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-red-50">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] border rounded-lg">
      <div ref={calendarRef} className="w-full h-full" />
    </div>
  );
};

export default NylasVirtualCalendar;
