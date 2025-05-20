import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, MoreVertical, Trash, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import EditAppointmentDialog from './EditAppointmentDialog';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if appointment is part of a recurring series
    if (appointment?.recurring_group_id) {
      setIsRecurring(true);
    } else {
      setIsRecurring(false);
    }
  }, [appointment]);

  // Return null if appointment is null to prevent errors
  if (!appointment) return null;

  // Enhanced logging to debug appointment data
  console.log('[AppointmentDetailsDialog] Rendering with appointment:', {
    id: appointment.id,
    clientName: appointment.clientName,
    clientId: appointment.client_id,
    client: appointment.client,
    start_at: appointment.start_at,
    end_at: appointment.end_at
  });

  // Format date for display - with better error handling
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No date available';
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date format';
    }
  };
  
  // Use start_at to format the date
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
  
  // Parse time from ISO string
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

  const handleDeleteAppointment = async () => {
    setIsLoading(true);
    try {
      if (isRecurring && deleteOption === 'series') {
        // Delete all future appointments in the series
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
        // Delete only this specific appointment
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

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{appointment.clientName || 'Unknown Client'}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditClick}>
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
                  {getFormattedTime(appointment.start_at)} - 
                  {getFormattedTime(appointment.end_at)}
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
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
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
      
      {appointment && (
        <EditAppointmentDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          appointment={appointment}
          onAppointmentUpdated={onAppointmentUpdated}
        />
      )}
    </>
  );
};

export default AppointmentDetailsDialog;
