
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
import { useToast } from '@/hooks/use-toast';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';
import { supabase } from '@/integrations/supabase/client';
import { TimeZoneService } from '@/utils/timeZoneService';

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

// Helper function to convert local date/time to UTC
const convertLocalToUTC = (dateString: string, timeString: string, timezone: string) => {
  try {
    const localDateTimeStr = `${dateString}T${timeString}`;
    return TimeZoneService.convertLocalToUTC(localDateTimeStr, timezone);
  } catch (error) {
    console.error('[BlockTimeDialog] Error converting to UTC:', error);
    throw error;
  }
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

  // Validate form inputs
  const validateInputs = () => {
    if (!selectedDate) {
      return 'Please select a date';
    }

    if (!selectedClinicianId) {
      return 'No clinician selected';
    }

    if (startTime >= endTime) {
      return 'End time must be after start time';
    }

    return null;
  };

  const handleSubmit = async () => {
    // Validate inputs
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
      // Get clinician's timezone with fallback
      let clinicianTimeZone;
      try {
        const timeZoneResult = await getClinicianTimeZone(selectedClinicianId!);
        clinicianTimeZone = Array.isArray(timeZoneResult) ? timeZoneResult[0] : timeZoneResult;
        
        if (!clinicianTimeZone) {
          clinicianTimeZone = 'America/New_York'; // Default fallback
        }
      } catch (tzError) {
        console.error('Error getting clinician timezone, using default:', tzError);
        clinicianTimeZone = 'America/New_York';
      }

      console.log('[BlockTimeDialog] Using clinician timezone:', clinicianTimeZone);

      // Format date for conversion
      const dateString = format(selectedDate!, 'yyyy-MM-dd');

      // Convert start and end times to UTC
      const startAtUTC = convertLocalToUTC(dateString, startTime, clinicianTimeZone);
      const endAtUTC = convertLocalToUTC(dateString, endTime, clinicianTimeZone);

      console.log('[BlockTimeDialog] Creating INTERNAL_BLOCKED_TIME appointment:', {
        dateString,
        startTime,
        endTime,
        clinicianTimeZone,
        startAtUTC: startAtUTC.toISO(),
        endAtUTC: endAtUTC.toISO()
      });

      // Create blocked time using pure INTERNAL_BLOCKED_TIME approach
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          clinician_id: selectedClinicianId!,
          client_id: '00000000-0000-0000-0000-000000000001', // Placeholder for compatibility
          start_at: startAtUTC.toJSDate().toISOString(),
          end_at: endAtUTC.toJSDate().toISOString(),
          type: 'INTERNAL_BLOCKED_TIME', // Pure stealth type
          status: 'hidden', // Stealth status
          notes: notes || `Blocked time: ${blockLabel}`,
          appointment_timezone: clinicianTimeZone
        })
        .select();

      if (error) {
        throw error;
      }

      console.log('✅ INTERNAL_BLOCKED_TIME appointment created successfully:', data);

      toast({
        title: "Success",
        description: "Time block created successfully using pure stealth method.",
      });

      onBlockCreated();
      onClose();
    } catch (error: any) {
      console.error('❌ Block time creation failed:', error);
      
      // Enhanced error messages based on specific error types
      let errorMessage = "Failed to create time block.";
      
      if (error?.message?.includes('violates foreign key constraint')) {
        errorMessage = "Database error: Invalid clinician reference.";
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
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Block Time (Pure Stealth)</DialogTitle>
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
              {isLoading ? 'Creating...' : 'Block Time (Stealth)'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTimeDialog;
