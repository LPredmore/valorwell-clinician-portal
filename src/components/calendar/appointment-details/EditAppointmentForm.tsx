
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';
import { TimeZoneService } from '@/utils/timeZoneService';

interface EditAppointmentFormProps {
  appointment: {
    id: string;
    start_at: string;
    type: string;
    status: string;
    notes?: string;
    clinician_id: string;
    appointment_timezone?: string;
    recurring_group_id?: string | null;
    client?: {
      client_first_name: string;
      client_last_name: string;
    }
  };
  onCancel: () => void;
  onSave: () => void;
  userTimeZone: string;
  editMode?: 'single' | 'future' | 'all';
}

const EditAppointmentForm: React.FC<EditAppointmentFormProps> = ({
  appointment,
  onCancel,
  onSave,
  userTimeZone,
  editMode = 'single'
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
    start_date: z.date({ required_error: 'Start date is required' }),
    start_time: z.string().min(1, 'Start time is required'),
    status: z.string().min(1, 'Status is required'),
    notes: z.string().optional(),
  });

  // CRITICAL: Convert UTC start_at to appointment's timezone for form display
  const getDefaultValues = () => {
    if (!appointment.start_at) {
      return {
        start_date: new Date(),
        start_time: '09:00',
        status: appointment.status || '',
        notes: appointment.notes || '',
      };
    }
    
    try {
      // Convert UTC time to appointment's timezone
      const utcDateTime = DateTime.fromISO(appointment.start_at, { zone: 'UTC' });
      const localDateTime = utcDateTime.setZone(displayTimeZone);
      
      return {
        start_date: localDateTime.toJSDate(),
        start_time: localDateTime.toFormat('HH:mm'),
        status: appointment.status || '',
        notes: appointment.notes || '',
      };
    } catch (error) {
      console.error('[EditAppointmentForm] Error converting start time:', error);
      return {
        start_date: new Date(),
        start_time: '09:00',
        status: appointment.status || '',
        notes: appointment.notes || '',
      };
    }
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // CRITICAL: Convert the edited date and time back to UTC using appointment's timezone
      const [hour, minute] = values.start_time.split(':').map(Number);
      
      // Create DateTime object in appointment's timezone
      const newStartDateTime = DateTime.fromObject(
        {
          year: values.start_date.getFullYear(),
          month: values.start_date.getMonth() + 1,
          day: values.start_date.getDate(),
          hour,
          minute
        },
        { zone: displayTimeZone }
      );
      
      // Calculate end time as 1 hour after start time
      const newEndDateTime = newStartDateTime.plus({ hours: 1 });
      
      // Convert both to UTC for storage in database
      const startUtc = newStartDateTime.toUTC().toISO();
      const endUtc = newEndDateTime.toUTC().toISO();

      // Use the existing appointment timezone or fetch the clinician's current timezone
      let appointmentTimeZone = appointment.appointment_timezone;
      if (!appointmentTimeZone) {
        appointmentTimeZone = await getClinicianTimeZone(appointment.clinician_id);
        console.warn(`[EditAppointmentForm] No existing appointment_timezone, using clinician timezone: ${appointmentTimeZone}`);
      }

      const updateData = {
        start_at: startUtc,
        end_at: endUtc,
        type: 'Therapy Session', // Always set to Therapy Session
        status: values.status,
        notes: values.notes,
        appointment_timezone: appointmentTimeZone
      };

      if (editMode === 'single' && appointment.recurring_group_id) {
        // For single edit of recurring appointment, break it from the series
        const { error } = await supabase
          .from('appointments')
          .update({
            ...updateData,
            recurring_group_id: null,
            appointment_recurring: null
          })
          .eq('id', appointment.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Appointment updated and removed from recurring series.",
        });
      } else if (editMode === 'future' && appointment.recurring_group_id) {
        // Calculate time difference for shifting future appointments
        const originalStartDateTime = DateTime.fromISO(appointment.start_at, { zone: 'UTC' });
        const timeDiffMinutes = newStartDateTime.toUTC().diff(originalStartDateTime, 'minutes').minutes;
        
        console.log('[EditAppointmentForm] Updating future appointments with time shift:', {
          originalStart: appointment.start_at,
          newStart: startUtc,
          timeDiffMinutes,
          recurringGroupId: appointment.recurring_group_id
        });

        // Get all future appointments in the series
        const { data: futureAppointments, error: fetchError } = await supabase
          .from('appointments')
          .select('id, start_at, end_at')
          .eq('recurring_group_id', appointment.recurring_group_id)
          .gte('start_at', appointment.start_at);

        if (fetchError) throw fetchError;

        // Update each appointment by applying the time shift
        const updatePromises = futureAppointments.map(async (appt) => {
          const apptStartDateTime = DateTime.fromISO(appt.start_at, { zone: 'UTC' });
          const apptEndDateTime = DateTime.fromISO(appt.end_at, { zone: 'UTC' });
          
          const newApptStartDateTime = apptStartDateTime.plus({ minutes: timeDiffMinutes });
          const newApptEndDateTime = apptEndDateTime.plus({ minutes: timeDiffMinutes });
          
          return supabase
            .from('appointments')
            .update({
              start_at: newApptStartDateTime.toISO(),
              end_at: newApptEndDateTime.toISO(),
              status: values.status,
              notes: values.notes,
              appointment_timezone: appointmentTimeZone
            })
            .eq('id', appt.id);
        });

        const results = await Promise.all(updatePromises);
        const errors = results.filter(result => result.error);
        
        if (errors.length > 0) {
          console.error('[EditAppointmentForm] Errors updating future appointments:', errors);
          throw new Error('Failed to update some future appointments');
        }
        
        toast({
          title: "Success",
          description: `Updated ${futureAppointments.length} future appointments in the series.`,
        });
      } else if (editMode === 'all' && appointment.recurring_group_id) {
        // Calculate time difference for shifting all appointments
        const originalStartDateTime = DateTime.fromISO(appointment.start_at, { zone: 'UTC' });
        const timeDiffMinutes = newStartDateTime.toUTC().diff(originalStartDateTime, 'minutes').minutes;
        
        console.log('[EditAppointmentForm] Updating all appointments with time shift:', {
          originalStart: appointment.start_at,
          newStart: startUtc,
          timeDiffMinutes,
          recurringGroupId: appointment.recurring_group_id
        });

        // Get all appointments in the series
        const { data: allAppointments, error: fetchError } = await supabase
          .from('appointments')
          .select('id, start_at, end_at')
          .eq('recurring_group_id', appointment.recurring_group_id);

        if (fetchError) throw fetchError;

        // Update each appointment by applying the time shift
        const updatePromises = allAppointments.map(async (appt) => {
          const apptStartDateTime = DateTime.fromISO(appt.start_at, { zone: 'UTC' });
          const apptEndDateTime = DateTime.fromISO(appt.end_at, { zone: 'UTC' });
          
          const newApptStartDateTime = apptStartDateTime.plus({ minutes: timeDiffMinutes });
          const newApptEndDateTime = apptEndDateTime.plus({ minutes: timeDiffMinutes });
          
          return supabase
            .from('appointments')
            .update({
              start_at: newApptStartDateTime.toISO(),
              end_at: newApptEndDateTime.toISO(),
              status: values.status,
              notes: values.notes,
              appointment_timezone: appointmentTimeZone
            })
            .eq('id', appt.id);
        });

        const results = await Promise.all(updatePromises);
        const errors = results.filter(result => result.error);
        
        if (errors.length > 0) {
          console.error('[EditAppointmentForm] Errors updating all appointments:', errors);
          throw new Error('Failed to update some appointments in the series');
        }
        
        toast({
          title: "Success",
          description: `Updated all ${allAppointments.length} appointments in the series.`,
        });
      } else {
        // Regular single appointment update
        const { error } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', appointment.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Appointment updated successfully",
        });
      }

      console.log('[EditAppointmentForm] Appointment update completed successfully, calling onSave callback');
      onSave(); // This will trigger the calendar refresh
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

  const getEditModeDescription = () => {
    if (!appointment.recurring_group_id) return '';
    
    switch (editMode) {
      case 'single':
        return 'Editing only this appointment (will be removed from recurring series)';
      case 'future':
        return 'Editing this and all future appointments in the series';
      case 'all':
        return 'Editing all appointments in the series';
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
          {editMode !== 'single' && appointment.recurring_group_id && (
            <div className="text-xs text-blue-600 mb-2">
              ℹ️ {getEditModeDescription()}
            </div>
          )}
        </div>
        
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time (1 hour appointment)</FormLabel>
              <FormControl>
                <TimePicker
                  value={field.value}
                  onChange={field.onChange}
                  className="mt-2"
                />
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
