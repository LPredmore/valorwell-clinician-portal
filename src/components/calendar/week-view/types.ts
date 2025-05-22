
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
  start: DateTime;
  end: DateTime;
  day: DateTime;
  clientId: string;
  clientName: string;
  type?: string;
  isPersonalEvent?: boolean;
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
  day: Date;
  timeSlot: Date;
  isAvailable: boolean;
  currentBlock?: TimeBlock;
  appointment?: AppointmentBlock;
  isStartOfBlock: boolean;
  isEndOfBlock: boolean;
  isStartOfAppointment: boolean;
  isEndOfAppointment?: boolean;
  handleAvailabilityBlockClick: (day: Date, block: TimeBlock) => void;
  onAppointmentClick?: (appointment: any) => void;
  onAppointmentDragStart?: (appointment: any, event: React.DragEvent) => void;
  onAppointmentDragOver?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  onAppointmentDrop?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  originalAppointments: any[];
}
