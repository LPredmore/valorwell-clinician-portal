
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DateTime } from 'luxon';

interface Client {
  id: string;
  name: string;
}

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clinicianId: string;
  clinicianTimeZone: string;
  onAppointmentCreated: () => void;
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
  clinicianId,
  clinicianTimeZone,
  onAppointmentCreated,
  initialData,
}) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    notes: '',
    startTime: '',
  });

  // Load clients when dialog opens
  useEffect(() => {
    if (!isOpen || !clinicianId) return;
    
    const loadClients = async () => {
      setIsLoadingClients(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, client_first_name, client_last_name, client_preferred_name')
          .eq('client_assigned_therapist', clinicianId)
          .order('client_first_name');

        if (error) throw error;
        
        const clientList = (data || []).map(c => ({
          id: c.id,
          name: `${c.client_preferred_name || c.client_first_name || ''} ${c.client_last_name || ''}`.trim() || 'Unknown Client'
        }));
        
        setClients(clientList);
      } catch (error) {
        console.error('Error loading clients:', error);
        toast({
          title: 'Error',
          description: 'Failed to load clients',
          variant: 'destructive'
        });
      } finally {
        setIsLoadingClients(false);
      }
    };

    loadClients();
  }, [isOpen, clinicianId, toast]);

  // Set initial values from props
  useEffect(() => {
    if (initialData && initialData.start) {
      // Convert the selected slot time to local datetime-local format
      const startDT = DateTime.fromJSDate(initialData.start);
      const startTime = startDT.toFormat("yyyy-MM-dd'T'HH:mm");
      
      setFormData({
        clientId: '',
        notes: initialData.notes || '',
        startTime,
      });
    } else {
      // Reset form for new appointments
      setFormData({
        clientId: '',
        notes: '',
        startTime: '',
      });
    }
  }, [initialData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const createVideoRoom = async (appointmentId: string): Promise<string | null> => {
    try {
      console.log('[AppointmentDialog] Creating video room for appointment:', appointmentId);
      
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: {
          appointmentId: appointmentId,
          forceNew: false
        }
      });

      if (error) {
        console.error('[AppointmentDialog] Video room creation error:', error);
        throw error;
      }

      if (data && data.url) {
        console.log('[AppointmentDialog] Video room created successfully:', data.url);
        return data.url;
      } else {
        console.error('[AppointmentDialog] No video URL in response:', data);
        return null;
      }
    } catch (error) {
      console.error('[AppointmentDialog] Failed to create video room:', error);
      return null;
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.clientId || !formData.startTime) {
      toast({
        title: 'Validation Error',
        description: 'Please select a client and start time',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingAppointment(true);

    try {
      // Parse start time and compute end time (start + 1 hour)
      const startDT = DateTime.fromISO(formData.startTime, { zone: clinicianTimeZone });
      const endDT = startDT.plus({ hours: 1 });
      
      // Convert to UTC for storage
      const startUtc = startDT.toUTC().toISO();
      const endUtc = endDT.toUTC().toISO();

      console.log('[AppointmentDialog] Creating appointment:', {
        client_id: formData.clientId,
        clinician_id: clinicianId,
        start_at: startUtc,
        end_at: endUtc,
        type: 'therapy_session',
        status: 'scheduled',
        notes: formData.notes,
        appointment_timezone: clinicianTimeZone
      });

      // Create appointment first
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: formData.clientId,
          clinician_id: clinicianId,
          start_at: startUtc,
          end_at: endUtc,
          type: 'therapy_session',
          status: 'scheduled',
          notes: formData.notes || null,
          appointment_timezone: clinicianTimeZone
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      console.log('[AppointmentDialog] Appointment created successfully:', appointment.id);

      // Create video room for therapy sessions
      if (appointment.type === 'therapy_session') {
        const videoRoomUrl = await createVideoRoom(appointment.id);
        
        if (videoRoomUrl) {
          // Update appointment with video room URL
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ video_room_url: videoRoomUrl })
            .eq('id', appointment.id);

          if (updateError) {
            console.error('[AppointmentDialog] Failed to update video room URL:', updateError);
            // Don't fail the entire operation for this
          } else {
            console.log('[AppointmentDialog] Video room URL updated successfully');
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Appointment created successfully' + (appointment.type === 'therapy_session' ? '. Video room will be available shortly.' : ''),
        duration: 4000
      });

      // Reset form and close dialog
      setFormData({
        clientId: '',
        notes: '',
        startTime: '',
      });
      
      onAppointmentCreated();
      onClose();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create appointment',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Title (read-only) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Title</Label>
            <div className="col-span-3 py-2 text-sm">Therapy Session</div>
          </div>
          
          {/* Client (searchable dropdown) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) => handleInputChange('clientId', value)}
              disabled={isLoadingClients || isCreatingAppointment}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Start Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start *
            </Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className="col-span-3"
              disabled={isCreatingAppointment}
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
              placeholder="Additional notes for this appointment..."
              disabled={isCreatingAppointment}
            />
          </div>

          {/* Timezone indicator */}
          <div className="text-xs text-gray-500 text-center">
            Times displayed in: {clinicianTimeZone} | Duration: 1 hour | Video room created automatically
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isCreatingAppointment}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isCreatingAppointment}>
            {isCreatingAppointment ? 'Creating...' : 'Save Appointment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
