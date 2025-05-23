
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';

export interface TimeBlock {
  id: string;
  start: DateTime;
  end: DateTime;
  day?: DateTime;
  availabilityIds: string[];
  isAvailable: boolean;
  isException?: boolean;
  isStandalone?: boolean;
}

export interface AppointmentBlock {
  id: string;
  clientId: string;
  clientName: string;
  start: DateTime;
  end: DateTime;
  day?: DateTime;
  type: string;
  status?: string;
  notes?: string;
  video_room_url?: string;
}

export interface AvailabilityException {
  id: string;
  clinician_id: string;
  start_time?: string;
  end_time?: string;
  date?: string;
  is_active: boolean;
  is_deleted?: boolean;
  specific_date?: string;
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
  isEndOfAppointment: boolean;
  handleAvailabilityBlockClick: (day: Date, block: any) => void;
  onAppointmentClick?: (appointment: any) => void;
  onAppointmentDragStart?: (appointment: any, event: React.DragEvent) => void;
  onAppointmentDragOver?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  onAppointmentDrop?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  originalAppointments?: Appointment[];
}
