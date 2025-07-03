
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
  userTimeZone: string; // Changed from clinicianTimeZone to match CalendarSimple
  onAppointmentCreated?: () => void;
  onAppointmentUpdated?: () => void;
  selectedSlot?: any; // Added missing prop
  isEditMode?: boolean; // Added missing prop
  editingAppointment?: any; // Added missing prop
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onClose,
  clinicianId,
  userTimeZone, // Changed from clinicianTimeZone
  onAppointmentCreated,
  onAppointmentUpdated,
  selectedSlot, // Added prop
  isEditMode = false, // Added prop with default
  editingAppointment // Added prop
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [startHour, setStartHour] = useState<string>('09');
  const [startMinute, setStartMinute] = useState<string>('00');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const appointmentId = editingAppointment?.id;

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0')
  }));

  // Generate minute options (only 00, 15, 30, 45)
  const minuteOptions = [
    { value: '00', label: '00' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' }
  ];

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
        isEdit: isEditMode,
        appointmentId,
        editingAppointment,
        selectedSlot
      });

      if (editingAppointment) {
        if (editingAppointment.client_id) {
          setSelectedClientId(editingAppointment.client_id);
        }
        
        setNotes(editingAppointment.notes || '');
        
        let startDateTime: DateTime | null = null;
        
        if (editingAppointment.start_at) {
          startDateTime = DateTime.fromISO(editingAppointment.start_at, { zone: 'UTC' })
            .setZone(editingAppointment.appointment_timezone || userTimeZone);
        } else if (editingAppointment.start) {
          startDateTime = DateTime.fromJSDate(editingAppointment.start)
            .setZone(userTimeZone);
        }
        
        if (startDateTime) {
          setDate(startDateTime.toFormat('yyyy-MM-dd'));
          setStartHour(startDateTime.toFormat('HH'));
          setStartMinute(startDateTime.toFormat('mm'));
        }
      } else if (selectedSlot) {
        // Handle slot selection for new appointments
        if (selectedSlot.start) {
          const startDateTime = DateTime.fromJSDate(selectedSlot.start)
            .setZone(userTimeZone);
          setDate(startDateTime.toFormat('yyyy-MM-dd'));
          setStartHour(startDateTime.toFormat('HH'));
          setStartMinute(startDateTime.toFormat('mm'));
        }
      } else {
        // Reset form for new appointments
        setSelectedClientId('');
        setDate('');
        setStartHour('09');
        setStartMinute('00');
        setNotes('');
      }
      
      setIsInitialized(true);
    } else if (!isOpen) {
      // Reset when dialog closes
      setIsInitialized(false);
      resetForm();
    }
  }, [isOpen, editingAppointment, selectedSlot, isInitialized, userTimeZone, isEditMode]);

  const resetForm = () => {
    setSelectedClientId('');
    setDate('');
    setStartHour('09');
    setStartMinute('00');
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
    
    if (!selectedClientId || !date || !startHour || !startMinute) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);

      // Validate timezone - use userTimeZone instead of clinicianTimeZone
      if (!userTimeZone) {
        throw new Error('User timezone not found - cannot create appointment');
      }

      const localDateTimeStart = `${date}T${startHour}:${startMinute}`;
      
      console.log('[AppointmentDialog] Converting times:', {
        localDateTimeStart,
        userTimeZone,
        isEdit: isEditMode
      });

      const startAtUTC = TimeZoneService.convertLocalToUTC(localDateTimeStart, userTimeZone);
      const endAtUTC = startAtUTC.plus({ hours: 1 });

      const appointmentData = {
        client_id: selectedClientId,
        clinician_id: clinicianId,
        start_at: startAtUTC.toISO(),
        end_at: endAtUTC.toISO(),
        appointment_timezone: userTimeZone,
        type: 'therapy_session',
        status: 'scheduled',
        notes: notes || null
      };

      console.log('[AppointmentDialog] Appointment data:', appointmentData);

      let error;
      if (isEditMode && appointmentId) {
        const result = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointmentId);
        error = result.error;
      } else {
        const result = await supabase
          .from('appointments')
          .insert(appointmentData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: isEditMode ? 'Appointment updated successfully' : 'Appointment created successfully'
      });

      resetForm();
      
      if (isEditMode) {
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
            <DialogTitle>{isEditMode ? 'Edit Appointment' : 'Create New Appointment'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Label className="text-right">Title</Label>
              <div className="col-span-3 py-2 text-sm">Therapy Session</div>
              
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

              <Label htmlFor="date" className="text-right">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="col-span-3"
              />

              <Label className="text-right">Start Time *</Label>
              <div className="col-span-3 flex gap-2">
                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="self-center">:</span>
                <Select value={startMinute} onValueChange={setStartMinute}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map((minute) => (
                      <SelectItem key={minute.value} value={minute.value}>
                        {minute.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for this appointment..."
                rows={3}
                className="col-span-4 w-full"
              />

              {userTimeZone && (
                <div className="col-span-4 text-sm text-gray-500 text-center">
                  Times will be saved in timezone: {userTimeZone} | Duration: 1 hour
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <div>
                {isEditMode && (
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
                  {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Appointment' : 'Create Appointment')}
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
