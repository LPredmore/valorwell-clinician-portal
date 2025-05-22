
export interface Appointment {
  id: string;
  clinician_id: string;
  client_id: string | null;
  start_at: string;
  end_at: string;
  type: string;
  status: string;
  notes?: string;
  clientName?: string;
  client?: {
    id: string;
    client_preferred_name: string;
    client_first_name: string;
    client_last_name: string;
  };
  google_calendar_event_id?: string;
  last_synced_at?: string;
  video_room_url?: string;
  cpt_code?: string;
  isPersonalEvent?: boolean; // Flag to identify synced personal events
}
