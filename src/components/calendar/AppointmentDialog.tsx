
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"
import { format } from 'date-fns';
import { TimeZoneService } from '@/utils/timeZoneService';
import { useToast } from "@/components/ui/use-toast"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { addDays, isBefore } from 'date-fns';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';
import { supabase, getOrCreateVideoRoom } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
  selectedDate?: Date | undefined;
  selectedTimeSlot?: { start: number, end: number } | undefined;
  clients: any[];
  loadingClients?: boolean;
  clinicianId?: string;
  selectedClinicianId?: string;
  onAppointmentCreated?: () => void;
}

// Helper function to format time from minutes (0-1439)
const formatTimeFromMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper function to get and validate clinician timezone
const getClinicianTimezone = async (clinicianId: string): Promise<string> => {
  console.log('[AppointmentDialog] Fetching clinician timezone for ID:', clinicianId);
  
  const { data, error } = await supabase
    .from('clinicians')
    .select('clinician_time_zone')
    .eq('id', clinicianId)
    .single();
    
  if (error) {
    console.error('[AppointmentDialog] Error fetching clinician timezone:', error);
    throw new Error(`Failed to fetch clinician timezone: ${error.message}`);
  }
  
  console.log('[AppointmentDialog] Raw clinician timezone data:', data);
  
  let timezone = data?.clinician_time_zone;
  
  if (!timezone) {
    console.error('[AppointmentDialog] No timezone found for clinician');
    throw new Error('Clinician timezone is not configured. Please contact an administrator.');
  }
  
  // If timezone is an array, use the first value
  if (Array.isArray(timezone)) {
    console.log('[AppointmentDialog] Timezone is array, using first value:', timezone[0]);
    timezone = timezone[0];
  }
  
  // Ensure it's a string
  timezone = String(timezone);
  
  if (!timezone || timezone.trim() === '') {
    console.error('[AppointmentDialog] Empty timezone string');
    throw new Error('Clinician timezone is empty. Please contact an administrator.');
  }
  
  console.log('[AppointmentDialog] Final processed timezone:', timezone);
  return timezone;
};

// Helper function to convert local date/time to UTC using specific timezone
const convertLocalToUTC = (date: Date, timeStr: string, timezone: string): Date => {
  console.log('[AppointmentDialog] Converting local time to UTC:', {
    date: format(date, 'yyyy-MM-dd'),
    timeStr,
    timezone
  });
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const dateTimeStr = `${dateStr}T${timeStr}`;
  
  // Create DateTime in the specified timezone
  const localDateTime = TimeZoneService.convertLocalToUTC(dateTimeStr, timezone);
  const utcDate = localDateTime.toJSDate();
  
  console.log('[AppointmentDialog] Conversion result:', {
    input: dateTimeStr,
    timezone,
    utcResult: utcDate.toISOString()
  });
  
  return utcDate;
};

// Helper function to generate time options for dropdown
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute of [0, 30]) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Convert to 12-hour format for display
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const display = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
      
      options.push({ value: time24, label: display });
    }
  }
  return options;
};

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  selectedTimeSlot,
  clients,
  loadingClients = false,
  clinicianId,
  selectedClinicianId,
  onAppointmentCreated
}) => {
  const [clientId, setClientId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringType, setRecurringType] = useState<string>('');
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined);
  const [recurringCount, setRecurringCount] = useState<string>('');
  const [timeZone, setTimeZone] = useState<string>(getUserTimeZone());
  const [startTime, setStartTime] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(selectedDate);
  const { toast } = useToast();

  // Debug logging for client data
  useEffect(() => {
    console.log('[AppointmentDialog] Client data received:', {
      clients,
      clientsLength: clients?.length,
      loadingClients,
      sampleClient: clients?.[0]
    });
  }, [clients, loadingClients]);

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (selectedDate && selectedTimeSlot) {
      const start = formatTimeFromMinutes(selectedTimeSlot.start);
      setStartTime(start);
    }
  }, [selectedDate, selectedTimeSlot]);

  useEffect(() => {
    setAppointmentDate(selectedDate);
  }, [selectedDate]);

  const saveAppointment = async (appointmentData: any) => {
    try {
      console.log('[AppointmentDialog] Saving appointment:', appointmentData);
      
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          client_id: appointmentData.clientId,
          clinician_id: appointmentData.clinicianId,
          start_at: appointmentData.startAt,
          end_at: appointmentData.endAt,
          type: appointmentData.type,
          status: 'scheduled',
          notes: appointmentData.notes,
          appointment_timezone: appointmentData.appointment_timezone,
          appointment_recurring: appointmentData.isRecurring ? appointmentData.recurringData?.recurringType : null,
          recurring_group_id: appointmentData.recurringGroupId || null
        }])
        .select()
        .single();

      if (error) {
        console.error('[AppointmentDialog] Error saving appointment:', error);
        throw error;
      }

      console.log('[AppointmentDialog] Appointment saved successfully, creating video room');
      
      // Create Daily.co video room URL for the new appointment
      try {
        const videoRoomResult = await getOrCreateVideoRoom(data.id, false);
        if (videoRoomResult.success) {
          console.log('[AppointmentDialog] Video room created successfully:', videoRoomResult.url);
        } else {
          console.warn('[AppointmentDialog] Failed to create video room, but appointment was saved:', videoRoomResult.error);
        }
      } catch (videoError) {
        console.warn('[AppointmentDialog] Video room creation failed, but appointment was saved:', videoError);
      }

      return { success: true, data };
    } catch (error) {
      console.error('[AppointmentDialog] Save error:', error);
      return { success: false, error };
    }
  };

  const generateRecurringDates = (startDate: Date, recurringType: string, endDate?: Date, count?: string) => {
    const dates = [];
    let currentDate = new Date(startDate);
    const maxCount = count ? parseInt(count) : 52; // Default max of 52 occurrences
    const actualEndDate = endDate || addDays(startDate, 365); // Default to 1 year if no end date

    for (let i = 0; i < maxCount && currentDate <= actualEndDate; i++) {
      dates.push(new Date(currentDate));
      
      switch (recurringType) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          break;
      }
    }

    return dates;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!clientId) {
      toast({
        title: "Missing Client",
        description: "Please select a client for the appointment.",
        variant: "destructive",
      })
      return;
    }

    if (!appointmentDate) {
      toast({
        title: "Missing Date",
        description: "Please select a date for the appointment.",
        variant: "destructive",
      })
      return;
    }

    if (!startTime) {
      toast({
        title: "Missing Time",
        description: "Please select a start time for the appointment.",
        variant: "destructive",
      })
      return;
    }

    const currentClinicianId = clinicianId || selectedClinicianId;
    if (!currentClinicianId) {
      toast({
        title: "Missing Clinician",
        description: "No clinician ID available for appointment creation.",
        variant: "destructive",
      })
      return;
    }

    try {
      // CRITICAL: Get the clinician's timezone first and validate it
      const clinicianTimezone = await getClinicianTimezone(currentClinicianId);
      
      console.log('[AppointmentDialog] Using clinician timezone for appointment creation:', clinicianTimezone);
      
      // Convert the selected wall time to UTC using the clinician's timezone
      const startDateTimeUTC = convertLocalToUTC(appointmentDate, startTime, clinicianTimezone);
      const endDateTimeUTC = new Date(startDateTimeUTC.getTime() + 60 * 60 * 1000); // 1 hour duration

      const recurringGroupId = isRecurring ? uuidv4() : null;
      let appointmentsToCreate = [];

      const baseAppointment = {
        clientId,
        clinicianId: currentClinicianId,
        type: 'Therapy Session',
        status: 'scheduled',
        notes,
        isRecurring,
        appointment_timezone: clinicianTimezone,
        recurring_group_id: recurringGroupId,
        appointment_recurring: isRecurring ? recurringType : null,
      };

      if (isRecurring) {
        const recurringDates = generateRecurringDates(startDateTimeUTC, recurringType, recurringEndDate, recurringCount);
        appointmentsToCreate = recurringDates.map(date => {
          const appointmentEnd = new Date(date.getTime() + 60 * 60 * 1000);
          return {
            ...baseAppointment,
            startAt: date.toISOString(),
            endAt: appointmentEnd.toISOString(),
          };
        });
      } else {
        appointmentsToCreate.push({
          ...baseAppointment,
          startAt: startDateTimeUTC.toISOString(),
          endAt: endDateTimeUTC.toISOString(),
        });
      }

      for (const appt of appointmentsToCreate) {
        const result = await saveAppointment(appt);
        if (!result.success) {
          throw result.error || new Error("Failed to save an appointment in the series.");
        }
      }
      
      toast({
        title: "Success!",
        description: `Successfully created ${appointmentsToCreate.length} appointment(s).`,
      });

      onClose();
      if (onAppointmentCreated) {
        onAppointmentCreated();
      }

    } catch (error: any) {
      console.error("[AppointmentDialog] Error creating appointment:", error);
      toast({
        title: "Error Creating Appointment",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client">Client</Label>
            {loadingClients ? (
              <p>Loading clients...</p>
            ) : (
              <Select onValueChange={setClientId} value={clientId}>
                <SelectTrigger id="client" className="mt-2">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_first_name} {c.client_last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <FormField
              control={{}}
              name="start_date"
              render={() => (
                <FormItem className="flex flex-col">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !appointmentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {appointmentDate ? format(appointmentDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={appointmentDate}
                        onSelect={setAppointmentDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
          </div>
          <div>
            <Label>Start Time</Label>
            <Select onValueChange={setStartTime} value={startTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(checked) => setIsRecurring(Boolean(checked))} />
            <Label htmlFor="recurring">This is a recurring appointment</Label>
          </div>
          {isRecurring && (
            <div className="space-y-4 pl-6 border-l-2">
              <Select onValueChange={setRecurringType} value={recurringType}>
                <SelectTrigger>
                  <SelectValue placeholder="Repeats..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Number of occurrences" value={recurringCount} onChange={e => setRecurringCount(e.target.value)} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !recurringEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {recurringEndDate ? format(recurringEndDate, "PPP") : <span>End date (optional)</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={recurringEndDate}
                    onSelect={setRecurringEndDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Appointment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;
