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
  userTimeZone: string;
  onAppointmentCreated?: () => void;
  onAppointmentUpdated?: () => void;
  selectedSlot?: any;
  isEditMode?: boolean;
  editingAppointment?: any;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  isOpen,
  onClose,
  clinicianId,
  userTimeZone,
  onAppointmentCreated,
  onAppointmentUpdated,
  selectedSlot,
  isEditMode = false,
  editingAppointment
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [startHour, setStartHour] = useState<string>('09');
  const [startMinute, setStartMinute] = useState<string>('00');
  const [startAMPM, setStartAMPM] = useState<string>('AM');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const appointmentId = editingAppointment?.id;

  // Generate hour options (1-12 for AM/PM format)
  const hourOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: (i + 1).toString().padStart(2, '0')
  }));

  // Generate minute options (only 00, 15, 30, 45)
  const minuteOptions = [
    { value: '00', label: '00' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' }
  ];

  // AM/PM options
  const ampmOptions = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' }
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
          const hour24 = startDateTime.hour;
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          setStartHour(hour12.toString().padStart(2, '0'));
          setStartMinute(startDateTime.toFormat('mm'));
          setStartAMPM(ampm);
        }
      } else if (selectedSlot) {
        // Handle slot selection for new appointments
        if (selectedSlot.start) {
          const startDateTime = DateTime.fromJSDate(selectedSlot.start)
            .setZone(userTimeZone);
          setDate(startDateTime.toFormat('yyyy-MM-dd'));
          const hour24 = startDateTime.hour;
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          setStartHour(hour12.toString().padStart(2, '0'));
          setStartMinute(startDateTime.toFormat('mm'));
          setStartAMPM(ampm);
        }
      } else {
        // Reset form for new appointments
        setSelectedClientId('');
        setDate('');
        setStartHour('09');
        setStartMinute('00');
        setStartAMPM('AM');
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
    setStartAMPM('AM');
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

  // Get the client name for the selected client (for edit mode display)
  const getSelectedClientName = () => {
    if (!selectedClientId || !clients.length) return '';
    const selectedClient = clients.find(client => client.id === selectedClientId);
    return selectedClient ? formatClientName(selectedClient) : '';
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

      // Convert 12-hour format to 24-hour format
      let hour24 = parseInt(startHour);
      if (startAMPM === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (startAMPM === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      const localDateTimeStart = `${date}T${hour24.toString().padStart(2, '0')}:${startMinute}`;
      
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
              <div className="col-span-3">
                {isEditMode && selectedClientId ? (
                  <div className="py-2 text-sm font-medium">{getSelectedClientName()}</div>
                ) : (
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                    disabled={isLoadingClients}
                  >
                    <SelectTrigger>
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
                )}
              </div>

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
                <Select value={startAMPM} onValueChange={setStartAMPM}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    {ampmOptions.map((ampm) => (
                      <SelectItem key={ampm.value} value={ampm.value}>
                        {ampm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Label htmlFor="notes" className="text-right col-span-1">Notes</Label>
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
                  {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Appointment')}
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
