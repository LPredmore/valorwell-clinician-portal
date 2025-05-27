
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
import { TimeZoneService } from '@/utils/timeZoneService';
import { v4 as uuidv4 } from 'uuid';

interface EditAppointmentFormProps {
  appointment: {
    id: string;
    start_at: string;
    type: string;
    status: string;
    notes?: string;
    clinician_id: string;
    appointment_timezone?: string;
    recurring_group_id?: string;
    client?: {
      client_first_name: string;
      client_last_name: string;
    }
  };
  onCancel: () => void;
  onSave: () => void;
  userTimeZone: string;
  editOption?: 'single' | 'future' | 'all';
}

const EditAppointmentForm: React.FC<EditAppointmentFormProps> = ({
  appointment,
  onCancel,
  onSave,
  userTimeZone,
  editOption = 'single'
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  // CRITICAL: Always use appointment's saved timezone for editing
  const getDisplayTimezone = () => {
    if (appointment.appointment_timezone) {
      return appointment.appointment_timezone;
    }
    
    // Fallback to user timezone with warning
    console.warn(`[EditAppointmentForm] Missing appointment_timezone for appointment ${appointment.id}, falling back to user timezone`);
    return userTimeZone;
  };

  const displayTimeZone = getDisplayTimezone();

  // Schema for form validation
  const formSchema = z.object({
    start_at: z.string().min(1, 'Start time is required'),
    status: z.string().min(1, 'Status is required'),
    notes: z.string().optional(),
  });

  // CRITICAL: Convert UTC start_at to appointment's timezone for form display
  const getDefaultStartTime = () => {
    if (!appointment.start_at) return '';
    
    try {
      // Convert UTC time to appointment's timezone
      const utcDateTime = DateTime.fromISO(appointment.start_at, { zone: 'UTC' });
      const localDateTime = utcDateTime.setZone(displayTimeZone);
      return localDateTime.toFormat('yyyy-MM-dd\'T\'HH:mm');
    } catch (error) {
      console.error('[EditAppointmentForm] Error converting start time:', error);
      return '';
    }
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      start_at: getDefaultStartTime(),
      status: appointment.status || '',
      notes: appointment.notes || '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // CRITICAL: Convert the edited time back to UTC using appointment's timezone
      const startDateTime = DateTime.fromISO(values.start_at, { zone: displayTimeZone });
      
      // Calculate end time as 1 hour after start time
      const endDateTime = startDateTime.plus({ hours: 1 });
      
      // Convert both to UTC for storage in database
      const startUtc = startDateTime.toUTC().toISO();
      const endUtc = endDateTime.toUTC().toISO();

      // Use the existing appointment timezone or fetch the clinician's current timezone
      let appointmentTimeZone = appointment.appointment_timezone;
      if (!appointmentTimeZone) {
        appointmentTimeZone = await getClinicianTimeZone(appointment.clinician_id);
        console.warn(`[EditAppointmentForm] No existing appointment_timezone, using clinician timezone: ${appointmentTimeZone}`);
      }

      if (editOption === 'single' && appointment.recurring_group_id) {
        // For single edit of recurring appointment, remove from series
        const { error } = await supabase
          .from('appointments')
          .update({
            start_at: startUtc,
            end_at: endUtc,
            type: 'Therapy Session',
            status: values.status,
            notes: values.notes,
            appointment_timezone: appointmentTimeZone,
            recurring_group_id: null, // Remove from recurring series
            appointment_recurring: null
          })
          .eq('id', appointment.id);

        if (error) throw error;
      } else if (editOption === 'future' && appointment.recurring_group_id) {
        // Edit this and all future appointments in the series
        const { error } = await supabase
          .from('appointments')
          .update({
            start_at: startUtc,
            end_at: endUtc,
            type: 'Therapy Session',
            status: values.status,
            notes: values.notes,
            appointment_timezone: appointmentTimeZone
          })
          .eq('recurring_group_id', appointment.recurring_group_id)
          .gte('start_at', appointment.start_at);

        if (error) throw error;
      } else if (editOption === 'all' && appointment.recurring_group_id) {
        // Edit all appointments in the series
        const { error } = await supabase
          .from('appointments')
          .update({
            start_at: startUtc,
            end_at: endUtc,
            type: 'Therapy Session',
            status: values.status,
            notes: values.notes,
            appointment_timezone: appointmentTimeZone
          })
          .eq('recurring_group_id', appointment.recurring_group_id);

        if (error) throw error;
      } else {
        // Single appointment or non-recurring appointment
        const { error } = await supabase
          .from('appointments')
          .update({
            start_at: startUtc,
            end_at: endUtc,
            type: 'Therapy Session',
            status: values.status,
            notes: values.notes,
            appointment_timezone: appointmentTimeZone
          })
          .eq('id', appointment.id);

        if (error) throw error;
      }

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

  const getEditOptionDescription = () => {
    if (!appointment.recurring_group_id) return '';
    
    switch (editOption) {
      case 'single':
        return 'This appointment will be removed from the recurring series.';
      case 'future':
        return 'This and all future appointments in the series will be updated.';
      case 'all':
        return 'All appointments in the series will be updated.';
      default:
        return '';
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Client: {getClientName()}</h3>
          {!appointment.appointment_timezone && (
            <div className="text-xs text-amber-600 mb-2">
              ⚠️ No saved timezone for this appointment, using {TimeZoneService.getTimeZoneDisplayName(displayTimeZone)}
            </div>
          )}
          {appointment.recurring_group_id && editOption && (
            <div className="text-xs text-blue-600 mb-2">
              📅 {getEditOptionDescription()}
            </div>
          )}
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
        
        {/* Appointment Type - Read-only display */}
        <div>
          <FormLabel>Appointment Type</FormLabel>
          <Input 
            value="Therapy Session" 
            readOnly 
            className="bg-gray-100 text-gray-600"
          />
        </div>
        
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
