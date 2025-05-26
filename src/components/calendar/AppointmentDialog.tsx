
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { supabase, getOrCreateVideoRoom } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getClinicianById, getClinicianTimeZone } from '@/hooks/useClinicianData';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import {
  DEFAULT_START_TIME,
  generateTimeOptions,
  calculateEndTime,
  ensureStringId,
  generateRecurringDates,
  formatTimeDisplay
} from '@/utils/appointmentUtils';
import { useEffect as useEffectDebug } from 'react';
import { TimeZoneService } from '@/utils/timeZoneService';

interface Client {
  id: string;
  displayName: string;
}

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  loadingClients: boolean;
  selectedClinicianId: string | null;
  onAppointmentCreated: () => void;
  userTimeZone?: string;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onClose,
  clients,
  loadingClients,
  selectedClinicianId,
  onAppointmentCreated,
  userTimeZone = TimeZoneService.ensureIANATimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
}) => {
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>(DEFAULT_START_TIME);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<string>('weekly');
  const [databaseClinicianId, setDatabaseClinicianId] = useState<string | null>(null);
  const [clinicianTimeZone, setClinicianTimeZone] = useState<string | null>(null);
  const [fetchingClinicianId, setFetchingClinicianId] = useState(false);
  const [appointmentCreationAttempts, setAppointmentCreationAttempts] = useState(0);
  const [lastError, setLastError] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<string>("unknown");
  
  // Helper function for consistent logging
  const logAppointmentDebug = (message: string, data: any = {}) => {
    console.log(`🔍 APPOINTMENT DIALOG - ${message}`, data);
  };
  
  // Format the clinician ID once
  const formattedClinicianId = ensureStringId(selectedClinicianId);
  
  // Generate time options once
  const timeOptions = generateTimeOptions();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthStatus(session ? "authenticated" : "unauthenticated");
      logAppointmentDebug('Auth status checked', { 
        isAuthenticated: !!session,
        userId: session?.user?.id || null
      });
    };
    
    checkAuth();
  }, []);
  
  // Fetch the database-formatted clinician ID and timezone when the dialog opens or clinician changes
  useEffect(() => {
    const fetchClinicianData = async () => {
      if (!formattedClinicianId) {
        logAppointmentDebug('No clinician ID provided');
        return;
      }
      
      logAppointmentDebug('Fetching database clinician ID and timezone', {
        formattedClinicianId,
        idType: typeof formattedClinicianId
      });
      
      setFetchingClinicianId(true);
      try {
        // Fetch clinician record
        const clinicianRecord = await getClinicianById(formattedClinicianId);
        logAppointmentDebug('Clinician record returned', {
          found: !!clinicianRecord,
          record: clinicianRecord
        });
        
        if (clinicianRecord) {
          setDatabaseClinicianId(clinicianRecord.id);
        } else {
          setDatabaseClinicianId(formattedClinicianId); // Fallback to formatted ID
        }
        
        // Fetch clinician timezone
        const timeZone = await getClinicianTimeZone(formattedClinicianId);
        logAppointmentDebug('Fetched clinician timezone', { timeZone });
        setClinicianTimeZone(timeZone);
        
      } catch (error) {
        logAppointmentDebug('Error fetching clinician data - falling back to formatted ID', {
          error: error instanceof Error ? error.message : String(error),
          attemptedId: formattedClinicianId
        });
        setDatabaseClinicianId(formattedClinicianId); // Fallback to formatted ID
        setClinicianTimeZone('America/Chicago'); // Default timezone fallback
      } finally {
        setFetchingClinicianId(false);
      }
    };
    
    fetchClinicianData();
  }, [formattedClinicianId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      logAppointmentDebug('Dialog opened, resetting form', {
        clientCount: clients.length,
        loadingClients,
        selectedClinicianId,
        formattedClinicianId,
        databaseClinicianId
      });
      
      // Reset error tracking
      setAppointmentCreationAttempts(0);
      setLastError(null);
      resetForm();
    }
  }, [isOpen]);

  // Reset form values
  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedClientId(null);
    setStartTime(DEFAULT_START_TIME);
    setIsRecurring(false);
    setRecurrenceType('weekly');
  };

  // Create appointment handler
  const handleCreateAppointment = async () => {
    // Increment attempt counter
    setAppointmentCreationAttempts(prev => prev + 1);
    
    if (!selectedClientId || !selectedDate || !startTime) {
      const missingFields = [];
      if (!selectedClientId) missingFields.push('client');
      if (!selectedDate) missingFields.push('date');
      if (!startTime) missingFields.push('start time');
      
      logAppointmentDebug('Missing required fields', { missingFields });
      
      toast({
        title: "Missing Information",
        description: `Please fill in all required fields: ${missingFields.join(', ')}.`,
        variant: "destructive"
      });
      return;
    }
    
    // Use the database-retrieved clinician ID or fall back to the formatted ID
    const clinicianIdToUse = databaseClinicianId || formattedClinicianId;
    
    if (!clinicianIdToUse || !clinicianTimeZone) {
      logAppointmentDebug('Missing clinician ID or timezone', {
        databaseClinicianId,
        formattedClinicianId,
        selectedClinicianId,
        clinicianTimeZone
      });
      
      toast({
        title: "Missing Information",
        description: "Clinician information not available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    logAppointmentDebug('Creating appointment', {
      attempt: appointmentCreationAttempts + 1,
      clinicianIdToUse,
      clinicianTimeZone,
      selectedClientId,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      startTime,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : null
    });

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const endTime = calculateEndTime(startTime);

      if (isRecurring) {
        const recurringGroupId = uuidv4();
        const recurringDates = generateRecurringDates(selectedDate, recurrenceType);
        
        logAppointmentDebug('Creating recurring appointments', {
          recurringGroupId,
          dateCount: recurringDates.length,
          firstDate: format(recurringDates[0], 'yyyy-MM-dd'),
          lastDate: format(recurringDates[recurringDates.length - 1], 'yyyy-MM-dd')
        });
        
        // Create a single video room URL for all recurring appointments
        let videoRoomUrl = null;
        try {
          const { url, error } = await getOrCreateVideoRoom(recurringGroupId);
          if (error) {
            console.error('Error creating video room:', error);
          } else {
            videoRoomUrl = url;
            logAppointmentDebug('Created video room for recurring appointments', { videoRoomUrl });
          }
        } catch (error) {
          console.error('Failed to create video room:', error);
        }
        
        const appointmentsToInsert = recurringDates.map(date => {
          // For each recurring date, create local date+time strings
          const localDateStr = format(date, 'yyyy-MM-dd');
          const localStartDateTimeStr = `${localDateStr}T${startTime}`;
          const localEndDateTimeStr = `${localDateStr}T${endTime}`;
          
          // Convert local date+time to UTC ISO strings
          const utcStartDateTime = TimeZoneService.convertLocalToUTC(localStartDateTimeStr, userTimeZone);
          const utcEndDateTime = TimeZoneService.convertLocalToUTC(localEndDateTimeStr, userTimeZone);
          
          // Validate that UTC conversion was successful
          if (!utcStartDateTime.isValid || !utcEndDateTime.isValid) {
            console.error("Failed to convert local time to UTC for recurring appointment", {
              localStartDateTimeStr,
              localEndDateTimeStr,
              userTimeZone,
              startInvalid: !utcStartDateTime.isValid,
              endInvalid: !utcEndDateTime.isValid
            });
            throw new Error("Failed to convert appointment times to UTC");
          }
          
          const utcStartAtISO = utcStartDateTime.toISO();
          const utcEndAtISO = utcEndDateTime.toISO();
          
          // Final validation to ensure ISO strings are not null
          if (!utcStartAtISO || !utcEndAtISO) {
            console.error("Generated null ISO string for UTC datetime", {
              utcStartDateTime,
              utcEndDateTime
            });
            throw new Error("Generated invalid UTC timestamp");
          }
          
          return {
            client_id: selectedClientId,
            clinician_id: clinicianIdToUse,
            start_at: utcStartAtISO,
            end_at: utcEndAtISO,
            type: "Therapy Session",
            status: 'scheduled',
            appointment_recurring: recurrenceType,
            recurring_group_id: recurringGroupId,
            video_room_url: videoRoomUrl,
            appointments_timezone: clinicianTimeZone // Save the clinician's timezone
          };
        });

        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentsToInsert)
          .select();

        if (error) {
          logAppointmentDebug('Error creating recurring appointments', {
            error: {
              message: error.message,
              code: error.code,
              details: error.details
            }
          });
          setLastError(error);
          throw error;
        }

        logAppointmentDebug('Successfully created recurring appointments', {
          count: data?.length || 0,
          firstAppointmentId: data?.[0]?.id
        });

        toast({
          title: "Recurring Appointments Created",
          description: `Created ${recurringDates.length} recurring appointments.`,
        });
      } else {
        // Convert local date+time to UTC ISO strings
        const localStartDateTimeStr = `${formattedDate}T${startTime}`;
        const localEndDateTimeStr = `${formattedDate}T${endTime}`;
        
        logAppointmentDebug('Converting local times to UTC', {
          localStartDateTimeStr,
          localEndDateTimeStr,
          userTimeZone
        });
        
        // Convert to UTC using TimeZoneService
        const utcStartDateTime = TimeZoneService.convertLocalToUTC(localStartDateTimeStr, userTimeZone);
        const utcEndDateTime = TimeZoneService.convertLocalToUTC(localEndDateTimeStr, userTimeZone);
        
        // Validate that UTC conversion was successful
        if (!utcStartDateTime.isValid || !utcEndDateTime.isValid) {
          logAppointmentDebug('UTC conversion failed - DateTime objects invalid', {
            startValid: utcStartDateTime.isValid,
            startInvalidReason: utcStartDateTime.invalidReason,
            startInvalidExplanation: utcStartDateTime.invalidExplanation,
            endValid: utcEndDateTime.isValid,
            endInvalidReason: utcEndDateTime.invalidReason,
            endInvalidExplanation: utcEndDateTime.invalidExplanation
          });
          throw new Error("Failed to convert appointment times to UTC");
        }
        
        // Convert DateTime objects to ISO strings
        const utcStartAtISO = utcStartDateTime.toISO();
        const utcEndAtISO = utcEndDateTime.toISO();
        
        // Final validation to ensure ISO strings are not null
        if (!utcStartAtISO || !utcEndAtISO) {
          logAppointmentDebug('Generated null ISO string for UTC datetime', {
            utcStartDateTime,
            utcEndDateTime
          });
          throw new Error("Generated invalid UTC timestamp");
        }
        
        logAppointmentDebug('Successfully converted to UTC', {
          utcStartAtISO,
          utcEndAtISO
        });
        
        // Create a video room for this individual appointment
        let videoRoomUrl = null;
        const appointmentId = uuidv4(); // Pre-generate ID to use for both appointment and video room
        
        try {
          const { url, error } = await getOrCreateVideoRoom(appointmentId);
          if (error) {
            console.error('Error creating video room:', error);
          } else {
            videoRoomUrl = url;
            logAppointmentDebug('Created video room for appointment', { videoRoomUrl });
          }
        } catch (error) {
          console.error('Failed to create video room:', error);
        }
        
        const appointmentData = {
          id: appointmentId, // Use pre-generated ID
          client_id: selectedClientId,
          clinician_id: clinicianIdToUse,
          start_at: utcStartAtISO,
          end_at: utcEndAtISO,
          type: "Therapy Session",
          status: 'scheduled',
          video_room_url: videoRoomUrl,
          appointments_timezone: clinicianTimeZone // Save the clinician's timezone
        };

        logAppointmentDebug('Creating single appointment', {
          appointmentData,
          localDateTime: localStartDateTimeStr,
          utcDateTime: utcStartAtISO,
          timezone: userTimeZone
        });

        const { data, error } = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select();

        if (error) {
          logAppointmentDebug('Error creating appointment', {
            error: {
              message: error.message,
              code: error.code,
              details: error.details
            },
            appointmentData
          });
          setLastError(error);
          throw error;
        }

        logAppointmentDebug('Successfully created appointment', {
          appointmentId: data?.[0]?.id,
          data: data?.[0]
        });

        toast({
          title: "Appointment Created",
          description: "The appointment has been successfully scheduled.",
        });
      }

      resetForm();
      onClose();
      onAppointmentCreated();

    } catch (error) {
      console.error('Error creating appointment:', error);
      
      // Provide more detailed error information
      let errorMessage = "Failed to create appointment. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      // If it's a database constraint error, provide more helpful message
      if (error && typeof error === 'object' && 'code' in error) {
        const errorObj = error as any;
        if (errorObj.code === '23503') {
          errorMessage = "Foreign key constraint error. The client or clinician ID may be invalid.";
        } else if (errorObj.code === '23505') {
          errorMessage = "This appointment conflicts with an existing appointment.";
        }
      }
      
      logAppointmentDebug('Appointment creation failed', {
        error: error instanceof Error ? error.message : String(error),
        attempt: appointmentCreationAttempts,
        clientId: selectedClientId,
        clinicianId: clinicianIdToUse
      });
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Appointment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="client">Client Name</Label>
            <Select
              value={selectedClientId || undefined}
              onValueChange={(value) => {
                console.log('🔍 DIALOG - Client selected:', value);
                setSelectedClientId(value);
              }}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {loadingClients ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : clients.length > 0 ? (
                  clients.map((client) => {
                    console.log('🔍 DIALOG - Rendering client option:', client);
                    return (
                      <SelectItem key={client.id} value={client.id}>
                        {client.displayName}
                      </SelectItem>
                    );
                  })
                ) : (
                  <SelectItem value="no-clients" disabled>
                    No clients assigned to this clinician
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground mt-1">
              {clients.length === 0 && !loadingClients ?
                "Debug info: No clients found for this clinician" :
                `Debug info: Found ${clients.length} clients`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time, userTimeZone)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
            <Label htmlFor="recurring">Make this a recurring appointment</Label>
          </div>

          {isRecurring && (
            <div className="grid gap-2">
              <Label htmlFor="recurrence">Recurrence Pattern</Label>
              <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                <SelectTrigger id="recurrence">
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreateAppointment} disabled={fetchingClinicianId}>
            {fetchingClinicianId ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Create ${isRecurring ? 'Recurring ' : ''}Appointment${isRecurring ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;
