
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

// Helper function to combine date and time strings into a Date object
const combineDateAndTime = (date: Date, timeStr: string, timezone: string): Date => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dateTimeStr = `${dateStr}T${timeStr}`;
  const localDateTime = TimeZoneService.convertLocalToUTC(dateTimeStr, timezone);
  return localDateTime.toJSDate();
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

  useEffect(() => {
    if (selectedDate && selectedTimeSlot) {
      const start = formatTimeFromMinutes(selectedTimeSlot.start);
      setStartTime(start);
    }
  }, [selectedDate, selectedTimeSlot]);

  useEffect(() => {
    setAppointmentDate(selectedDate);
  }, [selectedDate]);

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

    // Get the clinician's timezone for saving with the appointment
    const currentClinicianId = clinicianId || selectedClinicianId;
    let clinicianTimezone = timeZone;
    
    if (currentClinicianId) {
      try {
        clinicianTimezone = await getClinicianTimeZone(currentClinicianId);
      } catch (error) {
        console.error('Error fetching clinician timezone:', error);
        // Fall back to current timezone if we can't get clinician's timezone
      }
    }

    const startDateTime = combineDateAndTime(appointmentDate, startTime, clinicianTimezone);
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

    const appointmentData = {
      clientId: clientId,
      clinicianId: currentClinicianId,
      startAt: startDateTime.toISOString(),
      endAt: endDateTime.toISOString(),
      type: 'Therapy Session', // Always default to Therapy Session
      notes: notes,
      isRecurring: isRecurring,
      recurringData: recurringData,
      appointment_timezone: clinicianTimezone,
    };

    if (onSave) {
      onSave(appointmentData);
    }
    
    if (onAppointmentCreated) {
      onAppointmentCreated();
    }
    
    onClose();
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
                      {client.client_first_name} {client.client_last_name}
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
                  className="p-3 pointer-events-auto"
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
                        className="p-3 pointer-events-auto"
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
