
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';
import { BLOCKED_TIME_CLIENT_ID } from '@/utils/blockedTimeUtils';

interface BlockTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClinicianId: string | null;
  onBlockCreated: () => void;
}

// Debug logging utility
const debugLog = (step: string, data?: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ [BlockTime ERROR]' : '🔍 [BlockTime DEBUG]';
  console.log(`${prefix} [${timestamp}] ${step}`);
  if (data !== undefined) {
    console.log(data);
  }
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

const BlockTimeDialog: React.FC<BlockTimeDialogProps> = ({
  isOpen,
  onClose,
  selectedClinicianId,
  onBlockCreated
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [blockLabel, setBlockLabel] = useState('Blocked');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugStatus, setDebugStatus] = useState<string>('');
  const { toast } = useToast();

  const timeOptions = generateTimeOptions();

  // Debug state updates
  const updateDebugStatus = (status: string) => {
    setDebugStatus(status);
    debugLog(`Status Update: ${status}`);
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      debugLog('Dialog opened, resetting form');
      setSelectedDate(new Date());
      setStartTime('09:00');
      setEndTime('10:00');
      setBlockLabel('Blocked');
      setNotes('');
      setDebugStatus('');
    }
  }, [isOpen]);

  // Validate form inputs
  const validateInputs = () => {
    debugLog('Validating form inputs', {
      selectedDate: selectedDate?.toISOString(),
      selectedClinicianId,
      startTime,
      endTime,
      blockLabel
    });

    if (!selectedDate) {
      debugLog('Validation failed: No date selected', null, true);
      return 'Please select a date';
    }

    if (!selectedClinicianId) {
      debugLog('Validation failed: No clinician selected', null, true);
      return 'No clinician selected';
    }

    if (startTime >= endTime) {
      debugLog('Validation failed: Invalid time range', { startTime, endTime }, true);
      return 'End time must be after start time';
    }

    debugLog('Form validation passed');
    return null;
  };

  // Ensure blocked time client exists with comprehensive error handling
  const ensureBlockedTimeClient = async () => {
    try {
      debugLog('Step 1: Checking if blocked time client exists');
      updateDebugStatus('Checking blocked time client...');
      
      // Check if blocked time client already exists
      const { data: existingClient, error: checkError } = await supabase
        .from('clients')
        .select('id, client_first_name, client_last_name')
        .eq('id', BLOCKED_TIME_CLIENT_ID)
        .single();

      debugLog('Client check query result', {
        data: existingClient,
        error: checkError,
        errorCode: checkError?.code,
        errorMessage: checkError?.message
      });

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        debugLog('Database error during client check', checkError, true);
        throw new Error(`Database error checking client: ${checkError.message}`);
      }

      if (!existingClient) {
        debugLog('Step 2: Creating blocked time client');
        updateDebugStatus('Creating blocked time client...');
        
        // Create blocked time client with all required fields - FIXED: client_zipcode instead of client_zip
        const clientData = {
          id: BLOCKED_TIME_CLIENT_ID,
          client_first_name: 'Blocked',
          client_last_name: 'Time',
          client_preferred_name: 'Blocked',
          client_email: 'blocked@system.internal',
          client_phone: '000-000-0000',
          client_date_of_birth: '1900-01-01',
          client_address: 'System Internal',
          client_city: 'System',
          client_state: 'Internal',
          client_zipcode: '00000', // FIXED: was client_zip
          client_emergency_contact_name: 'System',
          client_emergency_contact_phone: '000-000-0000',
          client_emergency_contact_relationship: 'System',
          client_assigned_therapist: selectedClinicianId,
          client_status: 'active'
        };

        debugLog('Attempting to insert client with data', clientData);

        const { data: insertedClient, error: insertError } = await supabase
          .from('clients')
          .insert(clientData)
          .select();

        debugLog('Client insert result', {
          data: insertedClient,
          error: insertError,
          errorCode: insertError?.code,
          errorMessage: insertError?.message,
          errorHint: insertError?.hint,
          errorDetails: insertError?.details
        });

        if (insertError) {
          debugLog('Failed to create blocked time client', insertError, true);
          throw new Error(`Failed to create blocked time client: ${insertError.message}`);
        }

        debugLog('Successfully created blocked time client', insertedClient);
      } else {
        debugLog('Blocked time client already exists', existingClient);
      }

      updateDebugStatus('Blocked time client ready');
    } catch (error) {
      debugLog('Error in ensureBlockedTimeClient', error, true);
      updateDebugStatus('Failed to setup blocked time client');
      throw error;
    }
  };

  const handleSubmit = async () => {
    debugLog('=== BLOCK TIME SAVE STARTED ===');
    updateDebugStatus('Starting save process...');
    
    // Step 1: Validate inputs
    const validationError = validateInputs();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 2: Ensure blocked time client exists
      await ensureBlockedTimeClient();

      // Step 3: Get clinician's timezone with fallback
      debugLog('Step 3: Getting clinician timezone');
      updateDebugStatus('Getting clinician timezone...');
      
      let clinicianTimeZone;
      try {
        const timeZoneResult = await getClinicianTimeZone(selectedClinicianId!);
        clinicianTimeZone = Array.isArray(timeZoneResult) ? timeZoneResult[0] : timeZoneResult;
        
        if (!clinicianTimeZone) {
          clinicianTimeZone = 'America/New_York'; // Default fallback
        }
        
        debugLog('Clinician timezone resolved', { 
          original: timeZoneResult, 
          resolved: clinicianTimeZone 
        });
      } catch (tzError) {
        debugLog('Error getting clinician timezone, using default', tzError, true);
        clinicianTimeZone = 'America/New_York';
      }

      // Step 4: Parse times and create Date objects
      debugLog('Step 4: Parsing date and time values');
      updateDebugStatus('Processing date and time...');

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      debugLog('Parsed time components', {
        startHour, startMinute, endHour, endMinute,
        selectedDate: selectedDate!.toISOString()
      });

      // Create start and end Date objects
      const startDateTime = new Date(selectedDate!);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(selectedDate!);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      // Convert to ISO strings for storage
      const startAtISO = startDateTime.toISOString();
      const endAtISO = endDateTime.toISOString();

      debugLog('Generated ISO timestamps', {
        startAtISO,
        endAtISO,
        duration: (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60) + ' minutes'
      });

      // Step 5: Create the blocked time appointment
      debugLog('Step 5: Creating appointment record');
      updateDebugStatus('Creating appointment...');

      const appointmentData = {
        client_id: BLOCKED_TIME_CLIENT_ID,
        clinician_id: selectedClinicianId,
        start_at: startAtISO,
        end_at: endAtISO,
        type: 'Blocked Time',
        status: 'blocked',
        notes: notes || `Blocked time: ${blockLabel}`,
        appointment_timezone: clinicianTimeZone
      };

      debugLog('Attempting to insert appointment with data', appointmentData);

      const { data: createdAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select();

      debugLog('Appointment insert result', {
        data: createdAppointment,
        error: appointmentError,
        errorCode: appointmentError?.code,
        errorMessage: appointmentError?.message,
        errorHint: appointmentError?.hint,
        errorDetails: appointmentError?.details
      });

      if (appointmentError) {
        debugLog('Failed to create appointment', appointmentError, true);
        throw new Error(`Failed to create appointment: ${appointmentError.message}`);
      }

      debugLog('Successfully created blocked time appointment', createdAppointment);
      updateDebugStatus('Success!');

      toast({
        title: "Success",
        description: "Time block created successfully.",
      });

      onBlockCreated();
      onClose();
    } catch (error: any) {
      debugLog('=== BLOCK TIME SAVE FAILED ===', error, true);
      updateDebugStatus(`Failed: ${error.message}`);
      
      // Enhanced error messages based on specific error types
      let errorMessage = "Failed to create time block.";
      
      if (error?.message?.includes('violates foreign key constraint')) {
        errorMessage = "Database error: Invalid clinician or client reference.";
      } else if (error?.message?.includes('violates check constraint')) {
        errorMessage = "Database error: Invalid data format.";
      } else if (error?.message?.includes('duplicate key')) {
        errorMessage = "A conflicting time block already exists.";
      } else if (error?.message?.includes('permission denied')) {
        errorMessage = "Permission denied: You don't have access to create appointments.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      debugLog('=== BLOCK TIME SAVE COMPLETED ===');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Block Time</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Debug Status Display (only shown when debugging) */}
          {debugStatus && (
            <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">
              Status: {debugStatus}
            </div>
          )}

          <div>
            <Label htmlFor="blockLabel">Block Label</Label>
            <Input
              id="blockLabel"
              value={blockLabel}
              onChange={(e) => setBlockLabel(e.target.value)}
              placeholder="e.g., Lunch, Meeting, Personal"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="startTime">Start Time</Label>
            <Select onValueChange={setStartTime} value={startTime}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="endTime">End Time</Label>
            <Select onValueChange={setEndTime} value={endTime}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select end time" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this blocked time..."
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Block Time'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTimeDialog;
