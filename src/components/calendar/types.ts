
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';

export interface TimeSlotProps {
  day: Date;
  timeSlot: Date;
  isAvailable: boolean;
  currentBlock?: any;
  appointment?: any;
  isStartOfBlock: boolean;
  isEndOfBlock: boolean;
  isStartOfAppointment: boolean;
  isEndOfAppointment?: boolean;
  handleAvailabilityBlockClick: (day: Date, block: any) => void;
  onAppointmentClick?: (appointment: any) => void;
  onAppointmentDragStart?: (appointment: any, event: React.DragEvent) => void;
  onAppointmentDragOver?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
  onAppointmentDrop?: (day: Date, timeSlot: Date, event: React.DragEvent) => void;
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
