
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

interface EditRecurringAppointmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEditOptionSelected: (option: 'single' | 'future' | 'all') => void;
}

const EditRecurringAppointmentDialog: React.FC<EditRecurringAppointmentDialogProps> = ({
  isOpen,
  onOpenChange,
  onEditOptionSelected
}) => {
  const [editOption, setEditOption] = React.useState<'single' | 'future' | 'all'>('single');

  const handleConfirm = () => {
    onEditOptionSelected(editOption);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Recurring Appointment</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-4">
              <p>This is a recurring appointment. How would you like to edit it?</p>
              
              <RadioGroup value={editOption} onValueChange={(value) => setEditOption(value as 'single' | 'future' | 'all')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="edit-single" />
                  <Label htmlFor="edit-single">Edit only this appointment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="future" id="edit-future" />
                  <Label htmlFor="edit-future">Edit this and all future appointments in the series</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="edit-all" />
                  <Label htmlFor="edit-all">Edit all appointments in this series (including past appointments)</Label>
                </div>
              </RadioGroup>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EditRecurringAppointmentDialog;
