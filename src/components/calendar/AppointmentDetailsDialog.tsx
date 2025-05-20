import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, MoreVertical, Trash, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { format } from 'date-fns';
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
import { supabase } from '@/integrations/supabase/client';
import { formatClientName } from '@/utils/appointmentUtils';

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
  const [isLoading, setIsLoading] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'single' | 'series'>('single');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    if (appointment?.recurring_group_id) {
      setIsRecurring(true);
    } else {
      setIsRecurring(false);
    }
  }, [appointment]);

  useEffect(() => {
    if (appointment) {
      form.reset({
        start_at: DateTime.fromISO(appointment.start_at).toFormat('yyyy-MM-dd\'T\'HH:mm'),
        end_at: DateTime.fromISO(appointment.end_at).toFormat('yyyy-MM-dd\'T\'HH:mm'),
      });
    }
  }, [appointment, form]);

  if (!appointment) return null;

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          start_at: values.start_at,
          end_at: values.end_at
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });

      setIsEditing(false);
      onAppointmentUpdated();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAppointment = async () => {
    setIsLoading(true);
    try {
      if (isRecurring && deleteOption === 'series') {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('recurring_group_id', appointment.recurring_group_id)
          .gte('start_at', appointment.start_at);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "All future recurring appointments have been deleted.",
        });
      } else {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('id', appointment.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "The appointment has been deleted.",
        });
      }
      
      setIsDeleteDialogOpen(false);
      onClose();
      onAppointmentUpdated();
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

  const getClientName = () => {
    // If we have a complete client object with the fields we need
    if (appointment.client) {
      // Use the formatClientName utility for consistent formatting
      return formatClientName(appointment.client);
    }
    
    // Otherwise use the clientName field if available
    if (appointment.clientName) {
      return appointment.clientName;
    }
    
    // Fallback
    return 'Unknown Client';
  };

  const getFormattedDate = () => {
    if (!appointment.start_at) return 'No date available';
    try {
      const date = new Date(appointment.start_at);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting start_at date:', error);
      return 'Invalid date format';
    }
  };

  const getFormattedTime = (isoString: string | undefined) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time from ISO:', error);
      return 'Invalid time format';
    }
  };

  const getRecurrenceText = () => {
    if (!appointment.recurring_group_id) return '';
    
    switch (appointment.appointment_recurring) {
      case 'weekly':
        return 'Repeats weekly';
      case 'biweekly':
        return 'Repeats every 2 weeks';
      case 'monthly':
        return 'Repeats every 4 weeks';
      default:
        return '';
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Client: {getClientName()}</h3>
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
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {getClientName()}
                  </span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Appointment
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive" 
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Appointment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{getFormattedDate()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {getFormattedTime(appointment.start_at)} - {getFormattedTime(appointment.end_at)}
                  </span>
                </div>
                
                {isRecurring && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">
                      <Calendar className="h-3 w-3 mr-1" />
                      {getRecurrenceText()}
                    </Badge>
                  </div>
                )}
                
                <div>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    {appointment.status || 'Scheduled'}
                  </Badge>
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
    </>
  );
};

export default AppointmentDetailsDialog;
