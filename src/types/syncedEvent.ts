/**
 * SyncedEvent interface for events synced from Google Calendar.
 * These events are displayed as "Personal Block" on the calendar
 * to maintain privacy while still showing busy times.
 */
export interface SyncedEvent {
  id: string;
  clinician_id: string;
  start_at: string;       // UTC ISO timestamp
  end_at: string;         // UTC ISO timestamp
  google_calendar_event_id?: string | null;
  original_title?: string | null;
  original_description?: string | null;
  display_title: string;  // Always "Personal Block"
  is_busy: boolean;       // Only sync events marked as "busy" in Google Calendar
  created_at?: string;
  updated_at?: string;
}

/**
 * Convert a SyncedEvent to an Appointment-like object for display in the calendar.
 * This allows us to use the same rendering logic for both types of events.
 */
export function syncedEventToAppointmentLike(event: SyncedEvent): any {
  return {
    id: event.id,
    client_id: 'personal',
    clinician_id: event.clinician_id,
    start_at: event.start_at,
    end_at: event.end_at,
    type: 'personal',
    status: 'scheduled',
    clientName: event.display_title,
    // Add client object for compatibility with appointment rendering
    client: {
      client_first_name: '',
      client_last_name: '',
      client_preferred_name: event.display_title
    }
  };
}