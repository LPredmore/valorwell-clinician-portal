
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Appointment } from '@/types/appointment';
import AppointmentDetails from './appointment-details/AppointmentDetails';
import EditAppointmentForm from './appointment-details/EditAppointmentForm';
import DeleteAppointmentDialog from './appointment-details/DeleteAppointmentDialog';
import EditRecurringAppointmentDialog from './appointment-details/EditRecurringAppointmentDialog';

interface AppointmentDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onAppointmentUpdated: () => void;
  userTimeZone: string;
}

const AppointmentDetailsDialog: React.FC<AppointmentDetailsDialogProps> = ({
  isOpen,
  onClose,
  appointment,
  onAppointmentUpdated,
  userTimeZone
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditRecurringDialogOpen, setIsEditRecurringDialogOpen] = useState(false);
  const [editOption, setEditOption] = useState<'single' | 'future' | 'all'>('single');
  const { toast } = useToast();

  if (!appointment) return null;

  const handleAppointmentDeleted = () => {
    onClose();
    onAppointmentUpdated();
  };

  const handleAppointmentSaved = () => {
    setIsEditing(false);
    onAppointmentUpdated();
  };

  const handleEditClick = () => {
    // Check if appointment is recurring
    if (appointment.recurring_group_id) {
      setIsEditRecurringDialogOpen(true);
    } else {
      setIsEditing(true);
    }
  };

  const handleEditOptionSelected = (option: 'single' | 'future' | 'all') => {
    setEditOption(option);
    setIsEditing(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Appointment' : 'Appointment Details'}
            </DialogTitle>
          </DialogHeader>
          
          {isEditing ? (
            <EditAppointmentForm
              appointment={appointment}
              onCancel={() => setIsEditing(false)}
              onSave={handleAppointmentSaved}
              userTimeZone={userTimeZone}
              editOption={appointment.recurring_group_id ? editOption : undefined}
            />
          ) : (
            <AppointmentDetails
              appointment={appointment}
              onEditClick={handleEditClick}
              onDeleteClick={() => setIsDeleteDialogOpen(true)}
              onClose={onClose}
              onAppointmentUpdated={onAppointmentUpdated}
              userTimeZone={userTimeZone}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <EditRecurringAppointmentDialog
        isOpen={isEditRecurringDialogOpen}
        onOpenChange={setIsEditRecurringDialogOpen}
        onEditOptionSelected={handleEditOptionSelected}
      />
      
      <DeleteAppointmentDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        appointmentId={appointment.id}
        recurrenceId={appointment.recurring_group_id}
        appointmentStartAt={appointment.start_at}
        onDeleteSuccess={handleAppointmentDeleted}
      />
    </>
  );
};

export default AppointmentDetailsDialog;
