import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';

interface Client {
  id: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_preferred_name: string | null;
}

interface AppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clinicianId: string;
  clinicianTimeZone: string;
  selectedDate?: DateTime;
  selectedStartTime?: DateTime;
  selectedEndTime?: DateTime;
  onAppointmentCreated?: () => void;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onClose,
  clinicianId,
  clinicianTimeZone,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  onAppointmentCreated
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const { toast } = useToast();

  // Load clients when dialog opens
  useEffect(() => {
    if (isOpen && clinicianId) {
      loadClients();
    }
  }, [isOpen, clinicianId]);

  // Set initial values from props
  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        setDate(selectedDate.toFormat('yyyy-MM-dd'));
      }
      if (selectedStartTime) {
        setStartTime(selectedStartTime.toFormat('HH:mm'));
      }
    }
  }, [isOpen, selectedDate, selectedStartTime, selectedEndTime]);

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_first_name, client_last_name, client_preferred_name')
        .eq('client_assigned_therapist', clinicianId)
        .order('client_first_name');

      if (error) throw error;
      setClients(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId || !date || !startTime) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);

      // Validate timezone
      if (!clinicianTimeZone) {
        throw new Error('Clinician timezone not found - cannot create appointment');
      }

      // Convert local date/time to UTC for storage
      const localDateTimeStart = `${date}T${startTime}`;
      
      console.log('[AppointmentDialog] Converting times:', {
        localDateTimeStart,
        clinicianTimeZone
      });

      const startAtUTC = TimeZoneService.convertLocalToUTC(localDateTimeStart, clinicianTimeZone);
      const endAtUTC = startAtUTC.plus({ hours: 1 }); // Add 1 hour for appointment duration

      // Create appointment with proper timezone data
      const appointmentData = {
        client_id: selectedClientId,
        clinician_id: clinicianId,
        start_at: startAtUTC.toISO(),
        end_at: endAtUTC.toISO(),
        appointment_timezone: clinicianTimeZone, // CRITICAL: Save the timezone
        type: 'therapy_session',
        status: 'scheduled',
        notes: notes || null
      };

      console.log('[AppointmentDialog] Creating appointment:', appointmentData);

      const { error } = await supabase
        .from('appointments')
        .insert(appointmentData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Appointment created successfully'
      });

      // Reset form
      setSelectedClientId('');
      setDate('');
      setStartTime('');
      setNotes('');
      
      onAppointmentCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create appointment',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatClientName = (client: Client) => {
    const preferredName = client.client_preferred_name || client.client_first_name;
    const lastName = client.client_last_name;
    return `${preferredName || ''} ${lastName || ''}`.trim() || 'Unknown Client';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Appointment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {/* Title (read-only) */}
            <Label className="text-right">Title</Label>
            <div className="col-span-3 py-2 text-sm">Therapy Session</div>
            
            {/* Client (searchable dropdown) */}
            <Label htmlFor="client" className="text-right">Client *</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={isLoadingClients}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select client..."} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {formatClientName(client)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date */}
            <Label htmlFor="date" className="text-right">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="col-span-3"
            />

            {/* Start Time */}
            <Label htmlFor="startTime" className="text-right">Start Time *</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="col-span-3"
            />

            {/* Notes */}
            <Label htmlFor="notes" className="text-right">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this appointment..."
              rows={3}
              className="col-span-4 w-full"
            />

            {clinicianTimeZone && (
              <div className="col-span-4 text-sm text-gray-500 text-center">
                Times will be saved in timezone: {clinicianTimeZone} | Duration: 1 hour
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;
