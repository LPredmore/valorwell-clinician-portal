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
import { supabase } from '@/integrations/supabase/client';
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
      
      const { error } = await supabase
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
        }]);

      if (error) {
        console.error('[AppointmentDialog] Error saving appointment:', error);
        throw error;
      }

      console.log('[AppointmentDialog] Appointment saved successfully');
      return { success: true };
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
      const startDateTime = convertLocalToUTC(appointmentDate, startTime, clinicianTimezone);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        toast({
          title: "Invalid Date/Time",
          description: "Please enter a valid date and time.",
          variant: "destructive",
        });
        return;
      }

      let recurringData = null;
      if (isRecurring) {
        if (!recurringType) {
          toast({
            title: "Missing Recurrence Type",
            description: "Please select a recurrence type.",
            variant: "destructive",
          });
          return;
        }

        if (!recurringEndDate && !recurringCount) {
          toast({
            title: "Missing Recurrence End",
            description: "Please select either an end date or a number of occurrences for the recurring appointment.",
            variant: "destructive",
          });
          return;
        }

        if (recurringEndDate && isBefore(recurringEndDate, appointmentDate)) {
          toast({
            title: "Invalid End Date",
            description: "The recurring end date must be after the start date.",
            variant: "destructive",
          });
          return;
        }

        recurringData = {
          recurringType: recurringType,
          recurringEndDate: recurringEndDate ? recurringEndDate.toISOString() : null,
          recurringCount: recurringCount,
        };
      }

      if (isRecurring && recurringData) {
        // Generate recurring appointments
        const recurringGroupId = uuidv4();
        const recurringDates = generateRecurringDates(
          appointmentDate,
          recurringData.recurringType,
          recurringEndDate,
          recurringCount
        );

        console.log('[AppointmentDialog] Creating recurring appointments:', recurringDates.length);

        // Save each recurring appointment
        for (const date of recurringDates) {
          const recurringStartDateTime = convertLocalToUTC(date, startTime, clinicianTimezone);
          const recurringEndDateTime = new Date(recurringStartDateTime.getTime() + 60 * 60 * 1000);

          const appointmentData = {
            clientId: clientId,
            clinicianId: currentClinicianId,
            startAt: recurringStartDateTime.toISOString(),
            endAt: recurringEndDateTime.toISOString(),
            type: 'Therapy Session',
            notes: notes,
            isRecurring: true,
            recurringData: recurringData,
            appointment_timezone: clinicianTimezone, // Use clinician's timezone
            recurringGroupId: recurringGroupId,
          };

          const result = await saveAppointment(appointmentData);
          if (!result.success) {
            throw new Error(`Failed to save recurring appointment for ${date.toISOString()}`);
          }
        }

        toast({
          title: "Success",
          description: `${recurringDates.length} recurring appointments created successfully.`,
          variant: "success",
        });
      } else {
        // Save single appointment
        const appointmentData = {
          clientId: clientId,
          clinicianId: currentClinicianId,
          startAt: startDateTime.toISOString(),
          endAt: endDateTime.toISOString(),
          type: 'Therapy Session',
          notes: notes,
          isRecurring: false,
          recurringData: null,
          appointment_timezone: clinicianTimezone, // Use clinician's timezone
        };

        const result = await saveAppointment(appointmentData);
        if (!result.success) {
          throw new Error('Failed to save appointment');
        }

        toast({
          title: "Success",
          description: "Appointment created successfully.",
          variant: "success",
        });
      }

      // Call the legacy onSave prop if provided (for backward compatibility)
      if (onSave) {
        const legacyData = {
          clientId: clientId,
          clinicianId: currentClinicianId,
          startAt: startDateTime.toISOString(),
          endAt: endDateTime.toISOString(),
          type: 'Therapy Session',
          notes: notes,
          isRecurring: isRecurring,
          recurringData: recurringData,
          appointment_timezone: clinicianTimezone,
        };
        onSave(legacyData);
      }
      
      if (onAppointmentCreated) {
        onAppointmentCreated();
      }
      
      onClose();
    } catch (error) {
      console.error('[AppointmentDialog] Error creating appointment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRecurringChange = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setIsRecurring(isChecked);
    if (!isChecked) {
      setRecurringType('');
      setRecurringEndDate(undefined);
      setRecurringCount('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client">Client</Label>
            <Select onValueChange={setClientId} value={clientId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select a client"} />
              </SelectTrigger>
              <SelectContent>
                {clients && clients.length > 0 ? (
                  clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.displayName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    {loadingClients ? "Loading..." : "No clients available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type - Read-only display */}
          <div>
            <Label htmlFor="appointmentType">Appointment Type</Label>
            <Input 
              type="text" 
              value="Therapy Session" 
              readOnly 
              className="bg-gray-100 text-gray-600"
            />
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
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
                  {appointmentDate ? (
                    format(appointmentDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={appointmentDate}
                  onSelect={setAppointmentDate}
                  disabled={{ before: new Date() }}
                  initialFocus
                  className="p-3"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="startTime">Start Time (1 hour appointment)</Label>
            <Input
              type="time"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              type="text"
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={isRecurring}
              onCheckedChange={handleRecurringChange}
            />
            <Label htmlFor="isRecurring">Recurring Appointment</Label>
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <div>
                <Label htmlFor="recurringType">Recurring Type</Label>
                <Select onValueChange={setRecurringType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recurring type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recurringEndDate">Recurring End Date</Label>
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
                        {recurringEndDate ? (
                          format(recurringEndDate, "PPP")
                        ) : (
                          <span>Pick an end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={recurringEndDate}
                        onSelect={setRecurringEndDate}
                        disabled={{ before: addDays(appointmentDate || new Date(), 1) }}
                        initialFocus
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="recurringCount">Recurring Count</Label>
                  <Input
                    type="number"
                    id="recurringCount"
                    value={recurringCount}
                    onChange={(e) => setRecurringCount(e.target.value)}
                    placeholder="Number of occurrences"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogClose asChild>
            <Button type="submit">Schedule Appointment</Button>
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;
