
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  onAppointmentCreated?: () => void;
  onAppointmentUpdated?: () => void;
  initialData?: {
    start?: Date;
    end?: Date;
    start_at?: string;
    end_at?: string;
    title?: string;
    clientName?: string;
    notes?: string;
    appointment_timezone?: string;
    id?: string;
    client_id?: string;
  } | null;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onClose,
  clinicianId,
  clinicianTimeZone,
  onAppointmentCreated,
  onAppointmentUpdated,
  initialData
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const isEdit = Boolean(initialData?.id);
  const appointmentId = initialData?.id;

  // Load clients when dialog opens
  useEffect(() => {
    if (isOpen && clinicianId) {
      loadClients();
    }
  }, [isOpen, clinicianId]);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      console.log('[AppointmentDialog] Initializing form state', {
        isEdit,
        appointmentId,
        initialData
      });

      if (initialData) {
        // Handle existing appointment data
        if (initialData.client_id) {
          setSelectedClientId(initialData.client_id);
        }
        
        setNotes(initialData.notes || '');
        
        // Handle date/time from various possible sources
        let startDateTime: DateTime | null = null;
        
        if (initialData.start_at) {
          // From database - ISO string in UTC
          startDateTime = DateTime.fromISO(initialData.start_at, { zone: 'UTC' })
            .setZone(initialData.appointment_timezone || clinicianTimeZone);
        } else if (initialData.start) {
          // From slot selection - Date object
          startDateTime = DateTime.fromJSDate(initialData.start)
            .setZone(clinicianTimeZone);
        }
        
        if (startDateTime) {
          setDate(startDateTime.toFormat('yyyy-MM-dd'));
          setStartTime(startDateTime.toFormat('HH:mm'));
        }
      } else {
        // Reset form for new appointments
        setSelectedClientId('');
        setDate('');
        setStartTime('');
        setNotes('');
      }
      
      setIsInitialized(true);
    } else if (!isOpen) {
      // Reset when dialog closes
      setIsInitialized(false);
      resetForm();
    }
  }, [isOpen, initialData, isInitialized, clinicianTimeZone]);

  const resetForm = () => {
    setSelectedClientId('');
    setDate('');
    setStartTime('');
    setNotes('');
    setShowDeleteConfirm(false);
  };

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
        clinicianTimeZone,
        isEdit
      });

      const startAtUTC = TimeZoneService.convertLocalToUTC(localDateTimeStart, clinicianTimeZone);
      const endAtUTC = startAtUTC.plus({ hours: 1 }); // Add 1 hour for appointment duration

      const appointmentData = {
        client_id: selectedClientId,
        clinician_id: clinicianId,
        start_at: startAtUTC.toISO(),
        end_at: endAtUTC.toISO(),
        appointment_timezone: clinicianTimeZone,
        type: 'therapy_session',
        status: 'scheduled',
        notes: notes || null
      };

      console.log('[AppointmentDialog] Appointment data:', appointmentData);

      let error;
      if (isEdit && appointmentId) {
        // Update existing appointment
        const result = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointmentId);
        error = result.error;
      } else {
        // Create new appointment
        const result = await supabase
          .from('appointments')
          .insert(appointmentData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: isEdit ? 'Appointment updated successfully' : 'Appointment created successfully'
      });

      // Reset form
      resetForm();
      
      if (isEdit) {
        onAppointmentUpdated?.();
      } else {
        onAppointmentCreated?.();
      }
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save appointment',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointmentId) return;
    
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Appointment deleted successfully'
      });
      
      onAppointmentUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: 'Error', 
        description: 'Failed to delete appointment',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatClientName = (client: Client) => {
    const preferredName = client.client_preferred_name || client.client_first_name;
    const lastName = client.client_last_name;
    return `${preferredName || ''} ${lastName || ''}`.trim() || 'Unknown Client';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Appointment' : 'Create New Appointment'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {/* Title (read-only) */}
              <Label className="text-right">Title</Label>
              <div className="col-span-3 py-2 text-sm">Therapy Session</div>
              
              {/* Client */}
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

            <div className="flex justify-between pt-4">
              <div>
                {isEdit && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                  >
                    Delete Appointment
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Appointment' : 'Create Appointment')}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppointmentDialog;
