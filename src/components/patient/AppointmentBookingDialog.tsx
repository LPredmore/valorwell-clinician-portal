import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { videoRoomService } from '@/utils/videoRoomService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { DateTime } from 'luxon';

interface AppointmentBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clinicianId: string;
  selectedDate?: Date;
  selectedTime?: string;
}

const AppointmentBookingDialog: React.FC<AppointmentBookingDialogProps> = ({
  isOpen,
  onClose,
  clinicianId,
  selectedDate,
  selectedTime
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailableSlots();
  }, [selectedDate, clinicianId]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;
    
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('start_at, end_at')
        .eq('clinician_id', clinicianId);

      if (error) throw error;
      
      const bookedSlots = appointments?.map(apt => {
        const start = DateTime.fromISO(apt.start_at);
        const end = DateTime.fromISO(apt.end_at);
        
        let timeFormatOptions: Intl.DateTimeFormatOptions = {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        };
        
        return `${start.toLocaleString(timeFormatOptions)} - ${end.toLocaleString(timeFormatOptions)}`;
      }) || [];

      // Generate time slots (adjust interval as needed)
      const startTime = DateTime.fromJSDate(selectedDate).set({ hour: 9, minute: 0, second: 0 });
      const endTime = DateTime.fromJSDate(selectedDate).set({ hour: 17, minute: 0, second: 0 });
      let current = startTime;
      const slots = [];

      while (current <= endTime) {
        let timeFormatOptions: Intl.DateTimeFormatOptions = {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        };
        
        const slotEnd = current.plus({ minutes: 60 });
        const slot = `${current.toLocaleString(timeFormatOptions)} - ${slotEnd.toLocaleString(timeFormatOptions)}`;
        slots.push(slot);
        current = slotEnd;
      }

      // Filter out booked slots
      const available = slots.filter(slot => !bookedSlots.includes(slot));
      setAvailableSlots(available);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available appointment slots.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedSlot) {
      toast({
        title: "Error",
        description: "Please select a date and time slot.",
        variant: "destructive",
      });
      return;
    }

    // Extract start and end times from the selected slot
    const [startTimeStr, endTimeStr] = selectedSlot.split(' - ');
    
    // Parse the date and time using Luxon, setting the correct time zone
    const startDateTime = DateTime.fromJSDate(selectedDate);
    const [startHour, startMinute, startAMPM] = startTimeStr.split(/:|\s/);
    const startHourAdjusted = (startAMPM === 'PM' && parseInt(startHour) !== 12) ? parseInt(startHour) + 12 : (startAMPM === 'AM' && parseInt(startHour) === 12) ? 0 : parseInt(startHour);
    const startMinuteParsed = parseInt(startMinute);
    
    const endDateTime = DateTime.fromJSDate(selectedDate);
    const [endHour, endMinute, endAMPM] = endTimeStr.split(/:|\s/);
    const endHourAdjusted = (endAMPM === 'PM' && parseInt(endHour) !== 12) ? parseInt(endHour) + 12 : (endAMPM === 'AM' && parseInt(endHour) === 12) ? 0 : parseInt(endHour);
    const endMinuteParsed = parseInt(endMinute);

    const start = startDateTime.set({
      hour: startHourAdjusted,
      minute: startMinuteParsed,
      second: 0,
      millisecond: 0
    }).toISO();

    const end = endDateTime.set({
      hour: endHourAdjusted,
      minute: endMinuteParsed,
      second: 0,
      millisecond: 0
    }).toISO();

    try {
      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert([
          {
            clinician_id: clinicianId,
            start_at: start,
            end_at: end,
            type: 'therapy_session',
            status: 'scheduled',
            notes: notes,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Create video room asynchronously (non-blocking)
      if (newAppointment?.id) {
        console.log('[AppointmentBookingDialog] Triggering async video room creation for appointment:', newAppointment.id);
        videoRoomService.createVideoRoomAsync(newAppointment.id, 'normal');
      }

      toast({
        title: "Success",
        description: "Appointment booked successfully! Video room will be ready shortly.",
      });
      onClose();
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Error",
        description: "Failed to book appointment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Book Appointment</SheetTitle>
          <SheetDescription>
            {selectedDate ? selectedDate.toLocaleDateString() : 'Select a date to book an appointment.'}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">
              Notes
            </Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
          </div>
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <select
                id="time"
                className="col-span-3 rounded-md border border-gray-200 px-2 py-1"
                value={selectedSlot || ''}
                onChange={(e) => setSelectedSlot(e.target.value)}
              >
                <option value="">Select a time slot</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Available Slots
              </Label>
              <div className="col-span-3">No slots available for the selected date.</div>
            </div>
          )}
        </div>
        <Button onClick={handleSubmit}>Book Appointment</Button>
      </SheetContent>
    </Sheet>
  );
};

export default AppointmentBookingDialog;
