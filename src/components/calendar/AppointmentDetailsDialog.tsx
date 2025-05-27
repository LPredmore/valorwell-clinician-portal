
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
  const [isEditRecurringDialogOpen, setIsEditRecurringDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<'single' | 'future' | 'all'>('single');
  const { toast } = useToast();

  if (!appointment) return null;

  const isRecurring = !!appointment.recurring_group_id;

  const handleAppointmentDeleted = () => {
    console.log('[AppointmentDetailsDialog] Appointment deleted, triggering calendar refresh');
    onClose();
    onAppointmentUpdated(); // This triggers the calendar refresh
  };

  const handleAppointmentSaved = () => {
    console.log('[AppointmentDetailsDialog] Appointment saved, triggering calendar refresh');
    setIsEditing(false);
    onAppointmentUpdated(); // This triggers the calendar refresh
  };

  const handleEditClick = () => {
    if (isRecurring) {
      setIsEditRecurringDialogOpen(true);
    } else {
      setIsEditing(true);
    }
  };

  const handleEditOptionSelected = (option: 'single' | 'future' | 'all') => {
    setEditMode(option);
    setIsEditing(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
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
              editMode={editMode}
            />
          ) : (
            <AppointmentDetails
              appointment={appointment}
              onEditClick={handleEditClick}
              onDeleteClick={handleDeleteClick}
              onClose={onClose}
              onAppointmentUpdated={onAppointmentUpdated}
              userTimeZone={userTimeZone}
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

      <EditRecurringAppointmentDialog
        isOpen={isEditRecurringDialogOpen}
        onOpenChange={setIsEditRecurringDialogOpen}
        onEditOptionSelected={handleEditOptionSelected}
      />
    </>
  );
};

export default AppointmentDetailsDialog;
