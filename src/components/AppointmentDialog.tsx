
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateTime } from 'luxon';
import { useUser } from '@/context/UserContext';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';
import { useEffect } from 'react';

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    start?: Date;
    end?: Date;
    start_at?: string;
    end_at?: string;
    title?: string;
    clientName?: string;
    notes?: string;
    appointment_timezone?: string;
  } | null;
}

export const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { userId } = useUser();
  const [userTimeZone, setUserTimeZone] = useState<string>('America/New_York');
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    notes: '',
    startTime: '',
    endTime: '',
  });

  // Load user timezone
  useEffect(() => {
    if (userId) {
      getClinicianTimeZone(userId)
        .then(tz => setUserTimeZone(tz))
        .catch(err => console.error('Error loading timezone:', err));
    }
  }, [userId]);

  // Convert times to clinician timezone for display
  useEffect(() => {
    if (initialData) {
      let startTime = '';
      let endTime = '';

      if (initialData.start_at && initialData.end_at) {
        // For existing appointments, convert UTC to clinician timezone
        const appointmentTz = initialData.appointment_timezone || userTimeZone;
        const startDT = DateTime.fromISO(initialData.start_at)
          .setZone(appointmentTz);
        const endDT = DateTime.fromISO(initialData.end_at)
          .setZone(appointmentTz);
          
        startTime = startDT.toFormat("yyyy-MM-dd'T'HH:mm");
        endTime = endDT.toFormat("yyyy-MM-dd'T'HH:mm");
        
        console.log('[AppointmentDialog] Converting existing appointment times:', {
          originalStart: initialData.start_at,
          originalEnd: initialData.end_at,
          appointmentTimezone: appointmentTz,
          convertedStart: startTime,
          convertedEnd: endTime,
          startDT: startDT.toISO(),
          endDT: endDT.toISO()
        });
      } else if (initialData.start && initialData.end) {
        // For new appointments from slot selection, the Date objects are already in correct timezone
        const startDT = DateTime.fromJSDate(initialData.start);
        const endDT = DateTime.fromJSDate(initialData.end);
        
        startTime = startDT.toFormat("yyyy-MM-dd'T'HH:mm");
        endTime = endDT.toFormat("yyyy-MM-dd'T'HH:mm");
        
        console.log('[AppointmentDialog] Using slot selection times:', {
          slotStart: initialData.start.toISOString(),
          slotEnd: initialData.end.toISOString(),
          formattedStart: startTime,
          formattedEnd: endTime
        });
      }

      setFormData({
        title: initialData.title || '',
        clientName: initialData.clientName || '',
        notes: initialData.notes || '',
        startTime,
        endTime,
      });
    } else {
      // Reset form for new appointments
      setFormData({
        title: '',
        clientName: '',
        notes: '',
        startTime: '',
        endTime: '',
      });
    }
  }, [initialData, userTimeZone]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    console.log('[AppointmentDialog] Saving appointment with timezone context:', {
      formData,
      userTimeZone,
      initialData
    });
    // TODO: Implement save logic with proper timezone handling
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clientName" className="text-right">
              Client
            </Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start
            </Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">
              End
            </Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              className="col-span-3"
            />
          </div>
          
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
            />
          </div>

          {/* Timezone indicator */}
          <div className="text-xs text-gray-500 text-center">
            Times displayed in: {userTimeZone}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
