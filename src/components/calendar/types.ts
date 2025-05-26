
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';

export interface TimeSlotProps {
  day: DateTime;
  timeSlot: DateTime;
  isAvailable: boolean;
  currentBlock?: any;
  appointment?: any;
  isStartOfBlock: boolean;
  isEndOfBlock: boolean;
  isStartOfAppointment: boolean;
  isEndOfAppointment?: boolean;
  handleAvailabilityBlockClick: (day: DateTime, block: any) => void;
  onAppointmentClick?: (appointment: any) => void;
  onAppointmentDragStart?: (appointment: any, event: React.DragEvent) => void;
  onAppointmentDragOver?: (day: DateTime, timeSlot: DateTime, event: React.DragEvent) => void;
  onAppointmentDrop?: (day: DateTime, timeSlot: DateTime, event: React.DragEvent) => void;
  originalAppointments: any[];
}

export interface EditAppointmentDialogProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: (updatedAppointment: Appointment) => void;
  onDelete: (id: string) => void;
  isOpen?: boolean;
  onAppointmentUpdated?: () => void;
}
