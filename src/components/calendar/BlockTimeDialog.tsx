
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
import { TimeZoneService } from '@/utils/timeZoneService';
import { useBlockedTime } from '@/hooks/useBlockedTime';

interface BlockTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clinicianId: string; // Changed from selectedClinicianId to match CalendarSimple
  userTimeZone: string; // Added to match CalendarSimple
  onBlockedTimeCreated: () => void; // Changed from onBlockCreated to match CalendarSimple
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

const convertLocalToUTC = (dateString: string, timeString: string, timezone: string) => {
  try {
    const localDateTimeStr = `${dateString}T${timeString}`;
    return TimeZoneService.convertLocalToUTC(localDateTimeStr, timezone);
  } catch (error) {
    console.error('[BlockTimeDialog] Error converting to UTC:', error);
    throw error;
  }
};

const isValidUUID = (uuid: string | null): boolean => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const BlockTimeDialog: React.FC<BlockTimeDialogProps> = ({
  isOpen,
  onClose,
  clinicianId, // Changed from selectedClinicianId
  userTimeZone, // Added prop
  onBlockedTimeCreated // Changed from onBlockCreated
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [blockLabel, setBlockLabel] = useState('Blocked');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { createBlockedTime } = useBlockedTime(clinicianId || '');

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (isOpen) {
      const timestamp = new Date().toISOString();
      console.log(`[BlockTimeDialog] ${timestamp} Dialog opened with clinician ID:`, {
        clinicianId,
        type: typeof clinicianId,
        isNull: clinicianId === null,
        isUndefined: clinicianId === undefined,
        isEmpty: clinicianId === '',
        trimmedValue: clinicianId?.trim(),
        isValidUUID: isValidUUID(clinicianId),
        userTimeZone
      });

      // Reset form when dialog opens
      setSelectedDate(new Date());
      setStartTime('09:00');
      setEndTime('10:00');
      setBlockLabel('Blocked');
      setNotes('');
    }
  }, [isOpen, clinicianId, userTimeZone]);

  const validateInputs = () => {
    const timestamp = new Date().toISOString();
    console.log(`[BlockTimeDialog] ${timestamp} Starting validation with clinician ID:`, {
      clinicianId,
      type: typeof clinicianId,
      trimmed: clinicianId?.trim()
    });

    if (!selectedDate) {
      return 'Please select a date';
    }

    if (!clinicianId) {
      console.error(`[BlockTimeDialog] ${timestamp} Clinician ID is null/undefined:`, clinicianId);
      return 'No clinician selected - clinician ID is null or undefined';
    }

    if (typeof clinicianId !== 'string') {
      console.error(`[BlockTimeDialog] ${timestamp} Clinician ID is not a string:`, {
        clinicianId,
        type: typeof clinicianId
      });
      return 'Invalid clinician ID type - expected string';
    }

    if (clinicianId.trim() === '') {
      console.error(`[BlockTimeDialog] ${timestamp} Clinician ID is empty string after trim`);
      return 'No clinician selected - clinician ID is empty';
    }

    if (!isValidUUID(clinicianId)) {
      console.error(`[BlockTimeDialog] ${timestamp} Clinician ID is not a valid UUID:`, clinicianId);
      return 'Invalid clinician ID format - must be a valid UUID';
    }

    if (startTime >= endTime) {
      return 'End time must be after start time';
    }

    if (!userTimeZone) {
      return 'User timezone not available';
    }

    console.log(`[BlockTimeDialog] ${timestamp} Validation passed for clinician ID:`, clinicianId);
    return null;
  };

  const handleSubmit = async () => {
    const timestamp = new Date().toISOString();
    console.log(`[BlockTimeDialog] ${timestamp} Starting handleSubmit with clinician ID:`, {
      clinicianId,
      type: typeof clinicianId,
      isValidUUID: isValidUUID(clinicianId),
      trimmedValue: clinicianId?.trim(),
      userTimeZone
    });

    const validationError = validateInputs();
    if (validationError) {
      console.error(`[BlockTimeDialog] ${timestamp} Validation failed:`, validationError);
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log(`[BlockTimeDialog] ${timestamp} Proceeding with valid clinician ID:`, clinicianId);

      const dateString = format(selectedDate!, 'yyyy-MM-dd');
      const startAtUTC = convertLocalToUTC(dateString, startTime, userTimeZone);
      const endAtUTC = convertLocalToUTC(dateString, endTime, userTimeZone);

      console.log(`[BlockTimeDialog] ${timestamp} Creating blocked time slot:`, {
        clinician_id: clinicianId,
        dateString,
        startTime,
        endTime,
        userTimeZone,
        startAtUTC: startAtUTC.toISO(),
        endAtUTC: endAtUTC.toISO(),
        label: blockLabel,
        notes
      });

      const success = await createBlockedTime(
        startAtUTC.toJSDate().toISOString(),
        endAtUTC.toJSDate().toISOString(),
        blockLabel,
        notes || undefined,
        userTimeZone
      );

      if (success) {
        console.log(`[BlockTimeDialog] ${timestamp} ✅ Blocked time created successfully`);
        onBlockedTimeCreated();
        onClose();
      }
    } catch (error: any) {
      const timestamp = new Date().toISOString();
      console.error(`[BlockTimeDialog] ${timestamp} ❌ Block time creation failed:`, {
        error,
        errorMessage: error?.message,
        clinicianId
      });
      
      let errorMessage = "Failed to create time block.";
      
      if (error?.message?.includes('Overlapping blocked time slot')) {
        errorMessage = "This time slot overlaps with an existing blocked time. Please choose a different time.";
      } else if (error?.message?.includes('violates foreign key constraint')) {
        errorMessage = `Database error: Invalid clinician reference. Clinician ID: ${clinicianId}`;
      } else if (error?.message?.includes('violates check constraint')) {
        errorMessage = "Database error: Invalid data format.";
      } else if (error?.message?.includes('permission denied')) {
        errorMessage = "Permission denied: You don't have access to create blocked time.";
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
          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2 bg-gray-100 rounded text-xs">
              <strong>Debug Info:</strong><br />
              Clinician ID: {clinicianId || 'null/undefined'}<br />
              Type: {typeof clinicianId}<br />
              Valid UUID: {isValidUUID(clinicianId) ? 'Yes' : 'No'}<br />
              User Timezone: {userTimeZone || 'not set'}
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
