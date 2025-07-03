
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { DateTime } from 'luxon';

interface AppointmentBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clinicianId: string;
  onBookingComplete?: () => void;
}

const AppointmentBookingDialog: React.FC<AppointmentBookingDialogProps> = ({
  isOpen,
  onClose,
  clinicianId,
  onBookingComplete
}) => {
  const { toast } = useToast();
  const { userId } = useUser();
  const [isBooking, setIsBooking] = useState(false);
  const [formData, setFormData] = useState({
    startTime: '',
    notes: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBooking = async () => {
    if (!formData.startTime || !userId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a start time',
        variant: 'destructive'
      });
      return;
    }

    setIsBooking(true);

    try {
      // Parse start time and compute end time (start + 1 hour)
      const startDT = DateTime.fromISO(formData.startTime);
      const endDT = startDT.plus({ hours: 1 });
      
      // Convert to UTC for storage
      const startUtc = startDT.toUTC().toISO();
      const endUtc = endDT.toUTC().toISO();

      console.log('[AppointmentBookingDialog] Creating appointment (video room will be auto-created by trigger):', {
        client_id: userId,
        clinician_id: clinicianId,
        start_at: startUtc,
        end_at: endUtc,
        type: 'therapy_session',
        status: 'scheduled',
        notes: formData.notes
      });

      // Create appointment - video room URL will be automatically created by database trigger
      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: userId,
          clinician_id: clinicianId,
          start_at: startUtc,
          end_at: endUtc,
          type: 'therapy_session',
          status: 'scheduled',
          notes: formData.notes || null,
          appointment_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Appointment booked successfully! Video room will be available shortly.',
        duration: 4000
      });

      // Reset form and close dialog
      setFormData({
        startTime: '',
        notes: '',
      });
      
      if (onBookingComplete) {
        onBookingComplete();
      }
      onClose();
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to book appointment',
        variant: 'destructive'
      });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Start Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start Time *
            </Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className="col-span-3"
              disabled={isBooking}
            />
          </div>
          
          {/* Notes */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="col-span-3"
              rows={3}
              placeholder="Any additional notes for your appointment..."
              disabled={isBooking}
            />
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 text-center">
            Duration: 1 hour | Video room will be created automatically
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isBooking}>
            Cancel
          </Button>
          <Button onClick={handleBooking} disabled={isBooking}>
            {isBooking ? 'Booking...' : 'Book Appointment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentBookingDialog;
