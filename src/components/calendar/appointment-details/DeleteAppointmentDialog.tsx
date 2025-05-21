
import React from 'react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteAppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  recurrenceId: string | null;
  onDeleteSuccess: () => void;
}

const DeleteAppointmentDialog: React.FC<DeleteAppointmentDialogProps> = ({
  isOpen,
  onOpenChange,
  appointmentId,
  recurrenceId,
  onDeleteSuccess
}) => {
  const [deleteOption, setDeleteOption] = React.useState<'single' | 'series'>('single');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const isRecurring = !!recurrenceId;

  const handleDeleteAppointment = async () => {
    setIsLoading(true);
    try {
      if (isRecurring && deleteOption === 'series') {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('recurring_group_id', recurrenceId)
          .gte('start_at', new Date().toISOString());

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "All future recurring appointments have been deleted.",
        });
      } else {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('id', appointmentId);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "The appointment has been deleted.",
        });
      }
      
      onOpenChange(false);
      onDeleteSuccess();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: "Failed to delete the appointment.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Appointment{isRecurring ? 's' : ''}</AlertDialogTitle>
          <AlertDialogDescription>
            {isRecurring ? (
              <div className="space-y-4">
                <p>This is a recurring appointment. Would you like to delete just this appointment or all future appointments in this series?</p>
                
                <RadioGroup value={deleteOption} onValueChange={(value) => setDeleteOption(value as 'single' | 'series')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single">Delete only this appointment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="series" id="series" />
                    <Label htmlFor="series">Delete this and all future appointments in the series</Label>
                  </div>
                </RadioGroup>
              </div>
            ) : (
              "Are you sure you want to delete this appointment? This action cannot be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteAppointment} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAppointmentDialog;
