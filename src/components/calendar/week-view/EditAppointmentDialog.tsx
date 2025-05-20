
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage, 
  Form
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';

interface EditAppointmentDialogProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: (updatedAppointment: Appointment) => void;
  onDelete: (id: string) => void;
  isOpen?: boolean;
  onAppointmentUpdated?: () => void;
}

const EditAppointmentDialog: React.FC<EditAppointmentDialogProps> = ({ 
  appointment, 
  onClose, 
  onUpdate,
  onDelete,
  isOpen = true, 
  onAppointmentUpdated
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const formSchema = z.object({
    start_at: z.string().min(1, 'Start time is required'),
    end_at: z.string().min(1, 'End time is required'),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      start_at: appointment ? DateTime.fromISO(appointment.start_at).toFormat('yyyy-MM-dd\'T\'HH:mm') : '',
      end_at: appointment ? DateTime.fromISO(appointment.end_at).toFormat('yyyy-MM-dd\'T\'HH:mm') : '',
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (!appointment) return;
    
    const updatedAppointment = {
      ...appointment,
      start_at: values.start_at,
      end_at: values.end_at,
    };
    
    onUpdate(updatedAppointment);
    if (onAppointmentUpdated) {
      onAppointmentUpdated();
    }
  };

  const handleDelete = () => {
    if (isConfirmingDelete) {
      onDelete(appointment.id);
      if (onAppointmentUpdated) {
        onAppointmentUpdated();
      }
    } else {
      setIsConfirmingDelete(true);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Client: {appointment?.clientName || 'Unknown'}</h3>
            </div>
            
            <FormField
              control={form.control}
              name="start_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="end_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex gap-2">
              {isConfirmingDelete ? (
                <>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                  >
                    Confirm Delete
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save Changes</Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentDialog;
