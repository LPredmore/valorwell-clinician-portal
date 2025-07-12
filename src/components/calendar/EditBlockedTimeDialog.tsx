
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TimeZoneService } from '@/utils/timeZoneService';
import { useBlockedTime } from '@/hooks/useBlockedTime';
// Removed getClinicianTimeZone import - using browser timezone only
import { DateTime } from 'luxon';

interface BlockedTime {
  id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  label: string;
  notes?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

interface EditBlockedTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blockedTime: BlockedTime;
  onBlockedTimeUpdated: () => void;
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

const EditBlockedTimeDialog: React.FC<EditBlockedTimeDialogProps> = ({
  isOpen,
  onClose,
  blockedTime,
  onBlockedTimeUpdated
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [blockLabel, setBlockLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { toast } = useToast();
  const { updateBlockedTime, deleteBlockedTime } = useBlockedTime(blockedTime?.clinician_id || '');

  const timeOptions = generateTimeOptions();

  // Initialize form when dialog opens or blockedTime changes
  useEffect(() => {
    if (isOpen && blockedTime) {
      console.log('[EditBlockedTimeDialog] Initializing form with blocked time:', blockedTime);
      
      const loadForm = async () => {
        try {
          // Parse the UTC timestamps and convert to the browser timezone
          const startDateTime = DateTime.fromISO(blockedTime.start_at, { zone: 'UTC' })
            .setZone(browserTimeZone);
          const endDateTime = DateTime.fromISO(blockedTime.end_at, { zone: 'UTC' })
            .setZone(browserTimeZone);

          // Set form values
          setSelectedDate(startDateTime.toJSDate());
          setStartTime(startDateTime.toFormat('HH:mm'));
          setEndTime(endDateTime.toFormat('HH:mm'));
          setBlockLabel(blockedTime.label);
          setNotes(blockedTime.notes || '');
          
          console.log('[EditBlockedTimeDialog] Form initialized:', {
            date: startDateTime.toISODate(),
            startTime: startDateTime.toFormat('HH:mm'),
            endTime: endDateTime.toFormat('HH:mm'),
            label: blockedTime.label,
            timeZone: browserTimeZone
          });
        } catch (error) {
          console.error('[EditBlockedTimeDialog] Error initializing form:', error);
          toast({
            title: "Error",
            description: "Failed to load blocked time data",
            variant: "destructive"
          });
        }
      };
      
      loadForm();
    }
  }, [isOpen, blockedTime, toast]);

  const handleUpdate = async () => {
    if (!selectedDate || !blockedTime) return;

    setIsLoading(true);

    try {
      // Convert local date/time back to UTC for storage using browser timezone
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const startDateTime = DateTime.fromISO(`${dateString}T${startTime}`, { zone: browserTimeZone });
      const endDateTime = DateTime.fromISO(`${dateString}T${endTime}`, { zone: browserTimeZone });

      const updates = {
        start_at: startDateTime.toUTC().toISO(),
        end_at: endDateTime.toUTC().toISO(),
        label: blockLabel,
        notes: notes || undefined
      };

      const success = await updateBlockedTime(blockedTime.id, updates);

      if (success) {
        onBlockedTimeUpdated();
        onClose();
      }
    } catch (error: any) {
      console.error('[EditBlockedTimeDialog] Error updating blocked time:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update blocked time",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!blockedTime) return;

    setIsLoading(true);

    try {
      const success = await deleteBlockedTime(blockedTime.id);

      if (success) {
        onBlockedTimeUpdated();
        onClose();
      }
    } catch (error: any) {
      console.error('[EditBlockedTimeDialog] Error deleting blocked time:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete blocked time",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateInputs = () => {
    if (!selectedDate) return 'Please select a date';
    if (startTime >= endTime) return 'End time must be after start time';
    if (!blockLabel.trim()) return 'Please enter a label';
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Blocked Time</DialogTitle>
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

          <div className="flex justify-between gap-2 pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Blocked Time</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this blocked time? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={isLoading || !!validateInputs()}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditBlockedTimeDialog;
