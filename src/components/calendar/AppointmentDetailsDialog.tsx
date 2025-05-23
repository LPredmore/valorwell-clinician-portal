
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
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';

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
  const { isConnected, createGoogleCalendarEvent, isSyncing } = useGoogleCalendar();

  if (!appointment) return null;

  const handleAppointmentDeleted = () => {
    onClose();
    onAppointmentUpdated();
  };

  const handleAppointmentSaved = () => {
    setIsEditing(false);
    onAppointmentUpdated();
  };
  
  const syncToGoogleCalendar = async () => {
    if (!appointment) return;
    
    try {
      const eventId = await createGoogleCalendarEvent(appointment);
      if (eventId) {
        toast({
          title: "Success",
          description: "Appointment synced to Google Calendar",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync appointment to Google Calendar",
        variant: "destructive",
      });
    }
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
            <>
              <AppointmentDetails
                appointment={appointment}
                onEditClick={() => setIsEditing(true)}
                onDeleteClick={() => setIsDeleteDialogOpen(true)}
                onClose={onClose}
                onAppointmentUpdated={onAppointmentUpdated}
              />
              
              {isConnected && (
                <div className="mt-4 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={syncToGoogleCalendar}
                    disabled={isSyncing}
                  >
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    {isSyncing ? "Syncing..." : "Sync to Google Calendar"}
                  </Button>
                </div>
              )}
            </>
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
