
import { DateTime } from 'luxon';
import { AvailabilityBlock } from '@/types/availability';

// Re-export using the proper syntax for types with isolatedModules
export type { AvailabilityBlock };

export interface TimeBlock {
  start: DateTime;
  end: DateTime;
  day?: DateTime;
  availabilityIds: string[];
  isException: boolean;
  isStandalone: boolean;
}

export interface AppointmentBlock {
  id: string;
  appointmentId: string;
  clientId: string;
  clientName: string;
  start: DateTime;
  end: DateTime;
  day: DateTime;
  type?: string;
  status?: string;
  // Include all original appointment data for conversion
  start_at: string;
  end_at: string;
  appointment_recurring?: string | null;
  recurring_group_id?: string | null;
  video_room_url?: string | null;
  notes?: string | null;
  client?: any;
  appointment_timezone?: string; // Store the timezone used
}

export interface AvailabilityException {
  id: string;
  clinician_id: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  day_of_week?: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlotProps {
  day: DateTime;
  timeSlot: DateTime;
  isAvailable: boolean;
  currentBlock?: TimeBlock;
  appointment?: AppointmentBlock;
  isStartOfBlock: boolean;
  isEndOfBlock: boolean;
  isStartOfAppointment: boolean;
  handleAvailabilityBlockClick: (day: DateTime, block: TimeBlock) => void;
  onAppointmentClick?: (appointment: any) => void;
  originalAppointments: any[];
}
