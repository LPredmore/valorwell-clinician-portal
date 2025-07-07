import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RecurringActionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'edit' | 'delete';
  onSingleAction: () => void;
  onSeriesAction: () => void;
  isLoading?: boolean;
}

const RecurringActionDialog: React.FC<RecurringActionDialogProps> = ({
  isOpen,
  onOpenChange,
  actionType,
  onSingleAction,
  onSeriesAction,
  isLoading = false
}) => {
  const isEdit = actionType === 'edit';
  const title = isEdit ? 'Edit Recurring Appointment' : 'Delete Recurring Appointment';
  const description = isEdit 
    ? 'This appointment is part of a recurring series. What would you like to edit?'
    : 'This appointment is part of a recurring series. What would you like to delete?';
  const singleActionText = isEdit ? 'Edit just this appointment' : 'Delete just this appointment';
  const seriesActionText = isEdit ? 'Edit this and all future appointments' : 'Delete this and all future appointments';

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onSingleAction}
            disabled={isLoading}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            {singleActionText}
          </AlertDialogAction>
          <AlertDialogAction 
            onClick={onSeriesAction}
            disabled={isLoading}
            className={isEdit ? '' : 'bg-destructive hover:bg-destructive/90'}
          >
            {seriesActionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RecurringActionDialog;