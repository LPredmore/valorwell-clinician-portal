import { supabase } from '@/integrations/supabase/client';
import { SyncedEvent } from '@/types/syncedEvent';

/**
 * Sync Google Calendar events for a clinician.
 * This function fetches events from Google Calendar and stores them in the synced_events table.
 * Only events marked as "busy" are synced, and all events are displayed as "Personal Block".
 * 
 * @param clinicianId The ID of the clinician
 * @param googleAccessToken The Google OAuth access token
 * @param calendarId The Google Calendar ID (optional, defaults to primary)
 * @param timeMin Start time for events to sync (optional, defaults to now)
 * @param timeMax End time for events to sync (optional, defaults to 3 months from now)
 */
export async function syncGoogleCalendarEvents(
  clinicianId: string,
  googleAccessToken: string,
  calendarId: string = 'primary',
  timeMin: Date = new Date(),
  timeMax: Date = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
): Promise<{ success: boolean; message: string; syncedCount: number }> {
  try {
    // Format dates for Google Calendar API
    const timeMinIso = timeMin.toISOString();
    const timeMaxIso = timeMax.toISOString();

    // Fetch events from Google Calendar API
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      `timeMin=${encodeURIComponent(timeMinIso)}&` +
      `timeMax=${encodeURIComponent(timeMaxIso)}&` +
      `singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Calendar API error:', errorData);
      return { 
        success: false, 
        message: `Google Calendar API error: ${errorData.error?.message || 'Unknown error'}`,
        syncedCount: 0
      };
    }

    const data = await response.json();
    const events = data.items || [];
    
    console.log(`[syncGoogleCalendarEvents] Fetched ${events.length} events from Google Calendar`);

    // Filter to only include events marked as "busy" (not "transparent")
    const busyEvents = events.filter((event: any) => event.transparency !== 'transparent');
    console.log(`[syncGoogleCalendarEvents] Found ${busyEvents.length} busy events`);

    // Prepare events for batch insert/update
    const syncedEvents: Partial<SyncedEvent>[] = busyEvents.map((event: any) => ({
      clinician_id: clinicianId,
      google_calendar_event_id: event.id,
      start_at: event.start.dateTime || `${event.start.date}T00:00:00Z`,
      end_at: event.end.dateTime || `${event.end.date}T23:59:59Z`,
      original_title: event.summary || '',
      original_description: event.description || '',
      display_title: 'Personal Block',
      is_busy: true
    }));

    // Batch upsert to synced_events table
    const { error, count } = await supabase
      .from('synced_events')
      .upsert(syncedEvents, { 
        onConflict: 'google_calendar_event_id',
        ignoreDuplicates: false
      })
      .select('count');

    if (error) {
      console.error('Error upserting synced events:', error);
      return { 
        success: false, 
        message: `Error syncing events: ${error.message}`,
        syncedCount: 0
      };
    }

    console.log(`[syncGoogleCalendarEvents] Successfully synced ${count} events`);
    return { 
      success: true, 
      message: `Successfully synced ${count} events`,
      syncedCount: count || syncedEvents.length
    };
  } catch (error: any) {
    console.error('Error in syncGoogleCalendarEvents:', error);
    return { 
      success: false, 
      message: `Error: ${error.message || 'Unknown error'}`,
      syncedCount: 0
    };
  }
}

/**
 * Fetch synced events for a clinician within a date range.
 * 
 * @param clinicianId The ID of the clinician
 * @param startDate Start date for events to fetch
 * @param endDate End date for events to fetch
 */
export async function fetchSyncedEvents(
  clinicianId: string,
  startDate: string,
  endDate: string
): Promise<SyncedEvent[]> {
  try {
    const { data, error } = await supabase
      .from('synced_events')
      .select('*')
      .eq('clinician_id', clinicianId)
      .eq('is_busy', true)
      .gte('start_at', startDate)
      .lte('end_at', endDate);

    if (error) {
      console.error('Error fetching synced events:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchSyncedEvents:', error);
    return [];
  }
}