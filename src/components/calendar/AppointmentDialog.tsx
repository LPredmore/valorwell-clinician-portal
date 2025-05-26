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

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  selectedDate: Date | undefined;
  selectedTimeSlot: { start: number, end: number } | undefined;
  clients: any[];
  clinicianId: string;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  selectedTimeSlot,
  clients,
  clinicianId
}) => {
  const [clientId, setClientId] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('Initial Consultation');
  const [notes, setNotes] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringType, setRecurringType] = useState<string>('');
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined);
  const [recurringCount, setRecurringCount] = useState<string>('');
  const [timeZone, setTimeZone] = useState<string>(TimeZoneService.getBrowserTimeZone());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDate && selectedTimeSlot) {
      const start = TimeZoneService.formatTimeFromMinutes(selectedTimeSlot.start);
      const end = TimeZoneService.formatTimeFromMinutes(selectedTimeSlot.end);
      setStartTime(start);
      setEndTime(end);
    }
  }, [selectedDate, selectedTimeSlot]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!clientId) {
      toast({
        title: "Missing Client",
        description: "Please select a client for the appointment.",
        variant: "destructive",
      })
      return;
    }

    if (!selectedDate) {
      toast({
        title: "Missing Date",
        description: "Please select a date for the appointment.",
        variant: "destructive",
      })
      return;
    }

    const startDateTime = TimeZoneService.combineDateAndTime(selectedDate, startTime, timeZone);
    const endDateTime = TimeZoneService.combineDateAndTime(selectedDate, endTime, timeZone);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      toast({
        title: "Invalid Date/Time",
        description: "Please enter a valid date and time.",
        variant: "destructive",
      });
      return;
    }

    if (endDateTime <= startDateTime) {
      toast({
        title: "Invalid Time",
        description: "End time must be after start time.",
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

      if (recurringEndDate && isBefore(recurringEndDate, selectedDate)) {
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
      clinicianId: clinicianId,
      startAt: startDateTime.toISOString(),
      endAt: endDateTime.toISOString(),
      type: appointmentType,
      notes: notes,
      isRecurring: isRecurring,
      recurringData: recurringData,
      timeZone: timeZone,
    };

    onSave(appointmentData);
    onClose();
  };

  const handleRecurringChange = (checked: boolean | "indeterminate") => {
    // Convert CheckedState to boolean
    const isChecked = checked === true;
    setIsRecurring(isChecked);
    if (!isChecked) {
      setRecurringType('');
      setRecurringEndDate('');
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
            <Select onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.client_first_name} {client.client_last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="appointmentType">Appointment Type</Label>
            <Select onValueChange={setAppointmentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Initial Consultation">Initial Consultation</SelectItem>
                <SelectItem value="Follow-up Session">Follow-up Session</SelectItem>
                <SelectItem value="Therapy Session">Therapy Session</SelectItem>
                <SelectItem value="Evaluation">Evaluation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={onSave}
                  disabled={{ before: new Date() }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                type="time"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                type="time"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
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
                        disabled={{ before: addDays(selectedDate || new Date(), 1) }}
                        initialFocus
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
