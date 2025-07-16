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
import { videoRoomService } from '@/utils/videoRoomService';
import { utcToFormInput, formInputToUTC } from '@/utils/timezoneHelpers';
import { DateTime } from 'luxon';

interface Client {
  id: string;
  name: string;
  client_time_zone: string | null;
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
  const [selectedClientTimezone, setSelectedClientTimezone] = useState<string | null>(null);
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
          .select('id, client_first_name, client_last_name, client_preferred_name, client_time_zone')
          .eq('client_assigned_therapist', clinicianId)
          .order('client_first_name');

        if (error) throw error;
        
        const clientList = (data || []).map(c => ({
          id: c.id,
          name: `${c.client_preferred_name || c.client_first_name || ''} ${c.client_last_name || ''}`.trim() || 'Unknown Client',
          client_time_zone: c.client_time_zone
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

  // Set initial values using unified timezone conversion
  useEffect(() => {
    if (initialData && initialData.start) {
      // Convert JavaScript Date to UTC, then to form input format
      const utcISO = initialData.start.toISOString();
      const startTime = utcToFormInput(utcISO);
      
      console.log('[AppointmentDialog] Unified form initialization:', {
        originalStart: initialData.start.toISOString(),
        clinicianTimeZone,
        displayTime: startTime,
        conversionMethod: 'unified_timezone_helpers'
      });
      
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
  }, [initialData, clinicianTimeZone]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
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

    try {
      // Use unified conversion: form input → UTC for storage
      const startUtc = formInputToUTC(formData.startTime);
      
      // Calculate end time (start + 1 hour) in UTC
      const startDT = DateTime.fromISO(startUtc, { zone: 'UTC' });
      const endUtc = startDT.plus({ hours: 1 }).toISO();

      console.log('[AppointmentDialog] Creating appointment:', {
        client_id: formData.clientId,
        clinician_id: clinicianId,
        start_at: startUtc,
        end_at: endUtc,
        type: 'therapy_session',
        status: 'scheduled',
        notes: formData.notes
      });

      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert({
          client_id: formData.clientId,
          clinician_id: clinicianId,
          start_at: startUtc,
          end_at: endUtc,
          type: 'therapy_session',
          status: 'scheduled',
          notes: formData.notes || null,
          client_timezone: selectedClientTimezone
        })
        .select()
        .single();

      if (error) throw error;

      // Create video room asynchronously (non-blocking)
      if (newAppointment?.id) {
        console.log('[AppointmentDialog] Triggering async video room creation for appointment:', newAppointment.id);
        videoRoomService.createVideoRoomAsync(newAppointment.id, 'high');
      }

      toast({
        title: 'Success',
        description: 'Appointment created successfully. Video room will be ready shortly.'
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
              onValueChange={(clientId) => {
                handleInputChange('clientId', clientId);
                // Set the client timezone when client is selected
                const client = clients.find(c => c.id === clientId);
                setSelectedClientTimezone(client?.client_time_zone || null);
              }}
              disabled={isLoadingClients}
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
            />
          </div>

          {/* Timezone indicator */}
          <div className="text-xs text-gray-500 text-center">
            Times displayed in: {clinicianTimeZone} | Duration: 1 hour
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
