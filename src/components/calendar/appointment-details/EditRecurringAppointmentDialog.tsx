
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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

  const handleContinue = () => {
    onEditOptionSelected(editOption);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Recurring Appointment</DialogTitle>
          <DialogDescription>
            This is a recurring appointment. How would you like to edit it?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
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
              <Label htmlFor="edit-all">Edit all appointments in this series</Label>
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecurringAppointmentDialog;
