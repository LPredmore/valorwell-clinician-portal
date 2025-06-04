
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
  const { toast } = useToast();

  const timeOptions = generateTimeOptions();

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(new Date());
      setStartTime('09:00');
      setEndTime('10:00');
      setBlockLabel('Blocked');
      setNotes('');
    }
  }, [isOpen]);

  // Ensure blocked time client exists
  const ensureBlockedTimeClient = async () => {
    try {
      console.log('[BlockTimeDialog] Checking if blocked time client exists...');
      
      // Check if blocked time client already exists
      const { data: existingClient, error: checkError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', BLOCKED_TIME_CLIENT_ID)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('[BlockTimeDialog] Error checking for existing client:', checkError);
        throw checkError;
      }

      if (!existingClient) {
        console.log('[BlockTimeDialog] Creating blocked time client...');
        
        // Create blocked time client with all required fields
        const { error: insertError } = await supabase
          .from('clients')
          .insert({
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
            client_zip: '00000',
            client_emergency_contact_name: 'System',
            client_emergency_contact_phone: '000-000-0000',
            client_emergency_contact_relationship: 'System',
            client_assigned_therapist: selectedClinicianId,
            client_status: 'active'
          });

        if (insertError) {
          console.error('[BlockTimeDialog] Error creating blocked time client:', insertError);
          throw insertError;
        }

        console.log('[BlockTimeDialog] Successfully created blocked time client');
      } else {
        console.log('[BlockTimeDialog] Blocked time client already exists');
      }
    } catch (error) {
      console.error('[BlockTimeDialog] Error in ensureBlockedTimeClient:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    console.log('[BlockTimeDialog] Starting block time creation...');
    
    if (!selectedDate || !selectedClinicianId) {
      toast({
        title: "Error",
        description: "Please select a date and ensure a clinician is selected.",
        variant: "destructive"
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Error",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Ensure blocked time client exists
      await ensureBlockedTimeClient();

      console.log('[BlockTimeDialog] Getting clinician timezone...');
      
      // Get clinician's timezone with fallback
      let clinicianTimeZone;
      try {
        const timeZoneResult = await getClinicianTimeZone(selectedClinicianId);
        clinicianTimeZone = Array.isArray(timeZoneResult) ? timeZoneResult[0] : timeZoneResult;
        
        if (!clinicianTimeZone) {
          clinicianTimeZone = 'America/New_York'; // Default fallback
        }
        
        console.log('[BlockTimeDialog] Using timezone:', clinicianTimeZone);
      } catch (tzError) {
        console.warn('[BlockTimeDialog] Error getting clinician timezone, using default:', tzError);
        clinicianTimeZone = 'America/New_York';
      }

      // Parse times and create Date objects (simpler approach without Luxon)
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      // Create start and end Date objects
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      // Convert to ISO strings for storage (these will be in local time, but that's fine for now)
      const startAtISO = startDateTime.toISOString();
      const endAtISO = endDateTime.toISOString();

      console.log('[BlockTimeDialog] Creating appointment with data:', {
        client_id: BLOCKED_TIME_CLIENT_ID,
        clinician_id: selectedClinicianId,
        start_at: startAtISO,
        end_at: endAtISO,
        type: 'Blocked Time',
        status: 'blocked',
        appointment_timezone: clinicianTimeZone
      });

      // Create the blocked time appointment
      const { error, data } = await supabase
        .from('appointments')
        .insert({
          client_id: BLOCKED_TIME_CLIENT_ID,
          clinician_id: selectedClinicianId,
          start_at: startAtISO,
          end_at: endAtISO,
          type: 'Blocked Time',
          status: 'blocked',
          notes: notes || `Blocked time: ${blockLabel}`,
          appointment_timezone: clinicianTimeZone
        })
        .select();

      if (error) {
        console.error('[BlockTimeDialog] Error creating appointment:', error);
        throw error;
      }

      console.log('[BlockTimeDialog] Successfully created blocked time appointment:', data);

      toast({
        title: "Success",
        description: "Time block created successfully.",
      });

      onBlockCreated();
      onClose();
    } catch (error) {
      console.error('[BlockTimeDialog] Error creating time block:', error);
      
      // More specific error messages
      let errorMessage = "Failed to create time block. Please try again.";
      
      if (error?.message?.includes('violates foreign key constraint')) {
        errorMessage = "Error: Invalid clinician selected. Please refresh and try again.";
      } else if (error?.message?.includes('violates check constraint')) {
        errorMessage = "Error: Invalid data provided. Please check your inputs.";
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
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Block Time</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
