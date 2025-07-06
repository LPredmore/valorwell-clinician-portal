
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
import { TimeZoneService } from '@/utils/timeZoneService';

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

  const createVideoRoom = async (appointmentId: string): Promise<string | null> => {
    try {
      console.log('[AppointmentBookingDialog] Creating video room for appointment:', appointmentId);
      
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: {
          appointmentId: appointmentId,
          forceNew: false
        }
      });

      if (error) {
        console.error('[AppointmentBookingDialog] Video room creation error:', error);
        throw error;
      }

      if (data && data.url) {
        console.log('[AppointmentBookingDialog] Video room created successfully:', data.url);
        return data.url;
      } else {
        console.error('[AppointmentBookingDialog] No video URL in response:', data);
        return null;
      }
    } catch (error) {
      console.error('[AppointmentBookingDialog] Failed to create video room:', error);
      return null;
    }
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
      const startDT = TimeZoneService.convertLocalToUTC(formData.startTime, Intl.DateTimeFormat().resolvedOptions().timeZone);
      const endDT = startDT.plus({ hours: 1 });
      
      // Get UTC ISO strings for storage
      const startUtc = startDT.toISO();
      const endUtc = endDT.toISO();

      console.log('[AppointmentBookingDialog] Creating appointment:', {
        client_id: userId,
        clinician_id: clinicianId,
        start_at: startUtc,
        end_at: endUtc,
        type: 'therapy_session',
        status: 'scheduled',
        notes: formData.notes
      });

      // Create appointment first
      const { data: appointment, error: appointmentError } = await supabase
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
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      console.log('[AppointmentBookingDialog] Appointment created successfully:', appointment.id);

      // Create video room and update appointment atomically
      if (appointment.type === 'therapy_session') {
        try {
          const videoRoomUrl = await createVideoRoom(appointment.id);
          
          if (videoRoomUrl) {
            // Update appointment with video room URL
            const { data: updatedAppointment, error: updateError } = await supabase
              .from('appointments')
              .update({ video_room_url: videoRoomUrl })
              .eq('id', appointment.id)
              .select()
              .single();

            if (updateError) {
              console.error('[AppointmentBookingDialog] Failed to update video room URL:', updateError);
              toast({
                title: 'Warning',
                description: 'Appointment booked but video room setup incomplete. Please check your appointments.',
                variant: 'destructive'
              });
            } else {
              console.log('[AppointmentBookingDialog] Video room URL updated successfully');
              // Update the appointment object with the video URL for immediate UI reflection
              appointment.video_room_url = videoRoomUrl;
            }
          }
        } catch (videoError) {
          console.error('[AppointmentBookingDialog] Video room creation failed:', videoError);
          toast({
            title: 'Warning',
            description: 'Appointment booked but video room setup failed. You can still join via phone if needed.',
            variant: 'destructive'
          });
        }
      }

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
