
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';

interface EditAppointmentFormProps {
  appointment: {
    id: string;
    start_at: string;
    type: string;
    status: string;
    notes?: string;
    clinician_id: string;
    client?: {
      client_first_name: string;
      client_last_name: string;
    }
  };
  onCancel: () => void;
  onSave: () => void;
  userTimeZone: string;
}

const EditAppointmentForm: React.FC<EditAppointmentFormProps> = ({
  appointment,
  onCancel,
  onSave,
  userTimeZone
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  // Schema for form validation
  const formSchema = z.object({
    start_at: z.string().min(1, 'Start time is required'),
    type: z.string().min(1, 'Type is required'),
    status: z.string().min(1, 'Status is required'),
    notes: z.string().optional(),
  });

  // Format start_at for the datetime-local input
  const defaultStartTime = appointment.start_at 
    ? DateTime.fromISO(appointment.start_at).toFormat('yyyy-MM-dd\'T\'HH:mm')
    : '';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      start_at: defaultStartTime,
      type: appointment.type || '',
      status: appointment.status || '',
      notes: appointment.notes || '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Convert start time to DateTime object in user timezone
      const startDateTime = DateTime.fromISO(values.start_at, { zone: userTimeZone });
      
      // Calculate end time as 1 hour after start time
      const endDateTime = startDateTime.plus({ hours: 1 });
      
      // Convert both to UTC for storage in database
      const startUtc = startDateTime.toUTC().toISO();
      const endUtc = endDateTime.toUTC().toISO();

      // Fetch the clinician's current timezone to save with the appointment
      const clinicianTimeZone = await getClinicianTimeZone(appointment.clinician_id);

      const { error } = await supabase
        .from('appointments')
        .update({
          start_at: startUtc,
          end_at: endUtc,
          type: values.type,
          status: values.status,
          notes: values.notes,
          appointments_timezone: clinicianTimeZone // Save the clinician's timezone
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });

      onSave();
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

  const getClientName = () => {
    if (appointment.client) {
      return `${appointment.client.client_first_name} ${appointment.client.client_last_name}`;
    }
    return 'Unknown Client';
  };

  return (
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
              <FormLabel>Start Time (1 hour appointment)</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                End time will be automatically set to 1 hour after start time
              </p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Appointment Type</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EditAppointmentForm;
