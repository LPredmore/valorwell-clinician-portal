
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
import { videoRoomService } from '@/utils/videoRoomService';
// Removed getClinicianTimeZone import - using browser timezone only
import { formInputToUTC, utcToFormInput } from '@/utils/timezoneHelpers';
import { DateTime } from 'luxon';
import RecurringOptions, { RecurrenceFrequency } from './RecurringOptions';
import RecurringActionDialog from './RecurringActionDialog';

interface Client {
  id: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_preferred_name: string | null;
  client_email: string | null;
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
  const [clinicianData, setClinicianData] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Removed clinician timezone - using browser timezone
  
  // Recurring appointment states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [showRecurringAction, setShowRecurringAction] = useState(false);
  const [recurringActionType, setRecurringActionType] = useState<'edit' | 'delete'>('edit');
  
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
      loadClinicianData();
    }
  }, [isOpen, clinicianId]);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      console.log('[AppointmentDialog] Initializing form state', {
        isEdit: isEditMode,
        appointmentId,
        editingAppointment,
        selectedSlot,
        hasRecurringGroup: editingAppointment?.recurring_group_id,
        recurringGroupId: editingAppointment?.recurring_group_id
      });

      if (editingAppointment) {
        if (editingAppointment.client_id) {
          setSelectedClientId(editingAppointment.client_id);
        }
        
        setNotes(editingAppointment.notes || '');
        
        let startDateTime: DateTime | null = null;
        
        if (editingAppointment.start_at) {
          // Convert UTC timestamp to browser's local time for display
          const localDateTimeString = utcToFormInput(editingAppointment.start_at);
          console.log('[AppointmentDialog] Converting UTC to local time:', {
            utcTime: editingAppointment.start_at,
            localTime: localDateTimeString
          });
          
          // Parse the local datetime string (format: YYYY-MM-DDTHH:MM)
          const [datePart, timePart] = localDateTimeString.split('T');
          const [hourStr, minuteStr] = timePart.split(':');
          
          setDate(datePart);
          
          // Convert 24-hour to 12-hour format
          const hour24 = parseInt(hourStr);
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          
          setStartHour(hour12.toString().padStart(2, '0'));
          setStartMinute(minuteStr);
          setStartAMPM(ampm);
        } else if (editingAppointment.start) {
          startDateTime = DateTime.fromJSDate(editingAppointment.start);
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
          const startDateTime = DateTime.fromJSDate(selectedSlot.start);
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
    setIsRecurring(false);
    setRecurrenceFrequency('weekly');
    setRecurrenceCount(4);
    setShowRecurringAction(false);
  };

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_first_name, client_last_name, client_preferred_name, client_email')
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

  const loadClinicianData = async () => {
    if (!clinicianId) return;
    
    try {
      const { data, error } = await supabase
        .from('clinicians')
        .select('clinician_email, clinician_first_name, clinician_last_name, clinician_professional_name')
        .eq('id', clinicianId)
        .single();

      if (error) {
        console.error('[AppointmentDialog] Error loading clinician data:', error);
        return;
      }

      setClinicianData(data);
    } catch (error) {
      console.error('[AppointmentDialog] Exception loading clinician data:', error);
    }
  };

  // Removed clinician timezone loading - using browser timezone

  // Get the client name for the selected client (for edit mode display)
  const getSelectedClientName = () => {
    if (!selectedClientId || !clients.length) return '';
    const selectedClient = clients.find(client => client.id === selectedClientId);
    return selectedClient ? formatClientName(selectedClient) : '';
  };

  const createRecurringAppointments = async (baseData: any, recurringGroupId: string) => {
    const appointments = [];
    
    // Convert the base start time to DateTime for calculations
    const baseStartDateTime = DateTime.fromISO(baseData.start_at, { zone: 'utc' });
    
    for (let i = 0; i < recurrenceCount; i++) {
      let nextStartDateTime = baseStartDateTime;
      
      // Calculate the next appointment date based on frequency
      switch (recurrenceFrequency) {
        case 'weekly':
          nextStartDateTime = baseStartDateTime.plus({ weeks: i });
          break;
        case 'every_2_weeks':
          nextStartDateTime = baseStartDateTime.plus({ weeks: i * 2 });
          break;
        case 'every_3_weeks':
          nextStartDateTime = baseStartDateTime.plus({ weeks: i * 3 });
          break;
        case 'every_4_weeks':
          nextStartDateTime = baseStartDateTime.plus({ weeks: i * 4 });
          break;
      }
      
      const nextEndDateTime = nextStartDateTime.plus({ hours: 1 });
      
      appointments.push({
        ...baseData,
        start_at: nextStartDateTime.toISO(),
        end_at: nextEndDateTime.toISO(),
        recurring_group_id: recurringGroupId,
        appointment_recurring: recurrenceFrequency
      });
    }
    
    return appointments;
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

    if (isRecurring && (!recurrenceFrequency || recurrenceCount < 4)) {
      toast({
        title: 'Validation Error',
        description: 'Please complete recurring appointment settings',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);

      // Use browser timezone for creation
      console.log('[AppointmentDialog] Using browser timezone for creation:', {
        userTimeZone,
        isEdit: isEditMode
      });

      // Convert 12-hour format to 24-hour format
      let hour24 = parseInt(startHour);
      if (startAMPM === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (startAMPM === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      const localDateTimeStart = `${date}T${hour24.toString().padStart(2, '0')}:${startMinute}`;
      
      console.log('[AppointmentDialog] Converting times using browser timezone:', {
        localDateTimeStart,
        isEdit: isEditMode
      });

      // Use unified timezone helper with browser timezone
      const startAtUtcString = formInputToUTC(localDateTimeStart);
      const startAtUTC = DateTime.fromISO(startAtUtcString, { zone: 'UTC' });
      const endAtUTC = startAtUTC.plus({ hours: 1 });

      const appointmentData = {
        client_id: selectedClientId,
        clinician_id: clinicianId,
        start_at: startAtUtcString,
        end_at: endAtUTC.toISO(),
        type: 'therapy_session',
        status: 'scheduled',
        notes: notes || null,
        client_name: formatClientNameFromId(selectedClientId),
        date_of_session: startAtUTC.toISODate(),
        client_email: getClientEmail(selectedClientId),
        clinician_email: clinicianData?.clinician_email || '',
        clinician_name: formatClinicianName(clinicianData),
      };

      console.log('[AppointmentDialog] Appointment data:', appointmentData);

      let error;
      let newAppointmentIds: string[] = [];
      
      if (isEditMode && appointmentId) {
        // Handle editing existing appointments
        if (editingAppointment?.recurring_group_id) {
          // This is a recurring appointment - show action dialog
          setRecurringActionType('edit');
          setShowRecurringAction(true);
          setIsLoading(false);
          return;
        } else {
          // Regular single appointment update
          const result = await supabase
            .from('appointments')
            .update(appointmentData)
            .eq('id', appointmentId);
          error = result.error;
          newAppointmentIds = [appointmentId];
        }
      } else {
        // Creating new appointments
        if (isRecurring) {
          // Create recurring appointments
          const recurringGroupId = crypto.randomUUID();
          const appointments = await createRecurringAppointments(appointmentData, recurringGroupId);
          
          const result = await supabase
            .from('appointments')
            .insert(appointments)
            .select('id');
          
          error = result.error;
          newAppointmentIds = result.data?.map(a => a.id) || [];
        } else {
          // Create single appointment
          const result = await supabase
            .from('appointments')
            .insert(appointmentData)
            .select()
            .single();
          error = result.error;
          newAppointmentIds = result.data ? [result.data.id] : [];
        }
      }

      if (error) throw error;

      // Create video rooms for new appointments (non-blocking)
      if (!isEditMode && newAppointmentIds.length > 0) {
        console.log('[AppointmentDialog] Triggering async video room creation for appointments:', newAppointmentIds);
        newAppointmentIds.forEach(id => {
          videoRoomService.createVideoRoomAsync(id, 'high');
        });
      }

      const successMessage = isEditMode 
        ? 'Appointment updated successfully' 
        : isRecurring 
          ? `${recurrenceCount} recurring appointments created successfully. Video rooms will be ready shortly.`
          : 'Appointment created successfully. Video room will be ready shortly.';

      toast({
        title: 'Success',
        description: successMessage
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
    console.log('[AppointmentDialog] handleDelete called', {
      appointmentId,
      editingAppointment,
      hasRecurringGroup: !!editingAppointment?.recurring_group_id,
      recurringGroupId: editingAppointment?.recurring_group_id
    });
    
    if (!appointmentId) {
      console.log('[AppointmentDialog] No appointment ID, returning');
      return;
    }
    
    // Check if this is a recurring appointment
    if (editingAppointment?.recurring_group_id) {
      console.log('[AppointmentDialog] This is a recurring appointment, showing dialog');
      setRecurringActionType('delete');
      setShowRecurringAction(true);
      return;
    }
    
    console.log('[AppointmentDialog] Single appointment deletion, showing confirmation');
    // Show delete confirmation dialog for non-recurring appointments
    setShowDeleteConfirm(true);
  };

  const deleteSingleAppointment = async () => {
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

  const handleRecurringSingleEdit = async () => {
    if (!appointmentId) return;
    
    try {
      setIsLoading(true);
      
      // Remove from recurring group and update
      let hour24 = parseInt(startHour);
      if (startAMPM === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (startAMPM === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      const localDateTimeStart = `${date}T${hour24.toString().padStart(2, '0')}:${startMinute}`;
      const startAtUtcString = formInputToUTC(localDateTimeStart);
      const startAtUTC = DateTime.fromISO(startAtUtcString, { zone: 'UTC' });
      const endAtUTC = startAtUTC.plus({ hours: 1 });

      const { error } = await supabase
        .from('appointments')
        .update({
          client_id: selectedClientId,
          start_at: startAtUtcString,
          end_at: endAtUTC.toISO(),
          notes: notes || null,
          recurring_group_id: null,
          appointment_recurring: null
        })
        .eq('id', appointmentId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Appointment updated and removed from recurring series'
      });
      
      onAppointmentUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update appointment',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setShowRecurringAction(false);
    }
  };

  const handleRecurringSeriesEdit = async () => {
    if (!appointmentId || !editingAppointment?.recurring_group_id) return;
    
    try {
      setIsLoading(true);
      
      // Update all future appointments in the series
      let hour24 = parseInt(startHour);
      if (startAMPM === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (startAMPM === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      const localDateTimeStart = `${date}T${hour24.toString().padStart(2, '0')}:${startMinute}`;
      const startAtUtcString = formInputToUTC(localDateTimeStart);
      const startAtUTC = DateTime.fromISO(startAtUtcString, { zone: 'UTC' });
      
      // Get the original appointment start time to calculate time difference
      const originalStart = DateTime.fromISO(editingAppointment.start_at, { zone: 'utc' });
      const newStart = startAtUTC;
      const timeDiff = newStart.diff(originalStart);
      
      // Get all future appointments in the series (including current)
      const { data: futureAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select('id, start_at, end_at')
        .eq('recurring_group_id', editingAppointment.recurring_group_id)
        .gte('start_at', editingAppointment.start_at);
        
      if (fetchError) throw fetchError;
      
      // Update each future appointment
      const updates = futureAppointments?.map(apt => {
        const oldStart = DateTime.fromISO(apt.start_at, { zone: 'utc' });
        const oldEnd = DateTime.fromISO(apt.end_at, { zone: 'utc' });
        const newAptStart = oldStart.plus(timeDiff);
        const newAptEnd = oldEnd.plus(timeDiff);
        
        return {
          id: apt.id,
          client_id: selectedClientId,
          start_at: newAptStart.toISO(),
          end_at: newAptEnd.toISO(),
          appointment_timezone: userTimeZone,
          notes: notes || null
        };
      }) || [];
      
      // Batch update all appointments
      for (const update of updates) {
        const { error } = await supabase
          .from('appointments')
          .update(update)
          .eq('id', update.id);
          
        if (error) throw error;
      }
      
      toast({
        title: 'Success',
        description: `${updates.length} appointments in the series updated successfully`
      });
      
      onAppointmentUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error updating recurring series:', error);
      toast({
        title: 'Error',
        description: 'Failed to update recurring series',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setShowRecurringAction(false);
    }
  };

  const handleRecurringSingleDelete = async () => {
    if (!appointmentId) return;
    
    try {
      setIsDeleting(true);
      
      // Just delete this appointment
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Appointment deleted from series'
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
      setShowRecurringAction(false);
    }
  };

  const handleRecurringSeriesDelete = async () => {
    if (!appointmentId || !editingAppointment?.recurring_group_id) return;
    
    try {
      setIsDeleting(true);
      
      // Delete all future appointments in the series (including current)
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('recurring_group_id', editingAppointment.recurring_group_id)
        .gte('start_at', editingAppointment.start_at);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'All future appointments in the series deleted successfully'
      });
      
      onAppointmentUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error deleting recurring series:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete recurring series',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setShowRecurringAction(false);
    }
  };

  const formatClientName = (client: Client) => {
    const preferredName = client.client_preferred_name || client.client_first_name;
    const lastName = client.client_last_name;
    return `${preferredName || ''} ${lastName || ''}`.trim() || 'Unknown Client';
  };

  const formatClientNameFromId = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return '';
    const preferredName = client.client_preferred_name || client.client_first_name || '';
    const lastName = client.client_last_name || '';
    return `${preferredName} ${lastName}`.trim();
  };

  const getClientEmail = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.client_email || '';
  };

  const formatClinicianName = (clinician: any) => {
    if (!clinician) return '';
    return clinician.clinician_professional_name || 
           `${clinician.clinician_first_name || ''} ${clinician.clinician_last_name || ''}`.trim();
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
            </div>

            {/* Notes section spanning full width */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for this appointment..."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Recurring Options - only show for new appointments */}
            {!isEditMode && (
              <RecurringOptions
                isRecurring={isRecurring}
                onRecurringChange={setIsRecurring}
                recurrenceFrequency={recurrenceFrequency}
                onFrequencyChange={setRecurrenceFrequency}
                recurrenceCount={recurrenceCount}
                onCountChange={setRecurrenceCount}
                disabled={isLoading}
              />
            )}

            <div className="text-sm text-gray-500 text-center">
              Times will be saved in timezone: {userTimeZone} | Duration: 1 hour
            </div>

            <div className="flex justify-between pt-4">
              <div>
                {isEditMode && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => {
                      console.log('[AppointmentDialog] Delete button clicked', {
                        editingAppointment,
                        hasRecurringGroup: !!editingAppointment?.recurring_group_id,
                        recurringGroupId: editingAppointment?.recurring_group_id
                      });
                      handleDelete();
                    }}
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
              onClick={deleteSingleAppointment}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recurring Action Dialog */}
      <RecurringActionDialog
        isOpen={showRecurringAction}
        onOpenChange={setShowRecurringAction}
        actionType={recurringActionType}
        onSingleAction={recurringActionType === 'edit' ? handleRecurringSingleEdit : handleRecurringSingleDelete}
        onSeriesAction={recurringActionType === 'edit' ? handleRecurringSeriesEdit : handleRecurringSeriesDelete}
        isLoading={isLoading || isDeleting}
      />
    </>
  );
};

export default AppointmentDialog;
