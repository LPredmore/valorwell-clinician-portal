
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
            />
          ) : (
            <AppointmentDetails
              appointment={appointment}
              onEditClick={() => setIsEditing(true)}
              onDeleteClick={() => setIsDeleteDialogOpen(true)}
              onClose={onClose}
              onAppointmentUpdated={onAppointmentUpdated}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <DeleteAppointmentDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        appointmentId={appointment.id}
        recurrenceId={appointment.recurring_group_id}
        onDeleteSuccess={handleAppointmentDeleted}
      />
    </>
  );
};

export default AppointmentDetailsDialog;
