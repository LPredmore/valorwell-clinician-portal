
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { AvailabilityEditDialogProps } from './types';

// Time options for the dropdowns (15-minute intervals)
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(timeString);
    }
  }
  return options;
};

export const useAvailabilityEdit = (
  isOpen: boolean,
  onClose: () => void,
  availabilityBlock: AvailabilityEditDialogProps['availabilityBlock'],
  specificDate: AvailabilityEditDialogProps['specificDate'],
  clinicianId: AvailabilityEditDialogProps['clinicianId'],
  onAvailabilityUpdated: AvailabilityEditDialogProps['onAvailabilityUpdated']
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const timeOptions = generateTimeOptions();

  // Initialize times when dialog opens
  useEffect(() => {
    if (isOpen && availabilityBlock) {
      // Extract time from the availability block
      const start = new Date(availabilityBlock.start_time || availabilityBlock.start_at);
      const end = new Date(availabilityBlock.end_time || availabilityBlock.end_at);
      
      setStartTime(format(start, 'HH:mm'));
      setEndTime(format(end, 'HH:mm'));
    }
  }, [isOpen, availabilityBlock]);

  const handleSaveClick = useCallback(async () => {
    if (!specificDate || !clinicianId) return;

    setIsLoading(true);
    try {
      const dateString = format(specificDate, 'yyyy-MM-dd');
      const dayOfWeek = format(specificDate, 'EEEE').toLowerCase();

      // Create or update availability exception
      const { error } = await supabase
        .from('availability_exceptions')
        .upsert({
          clinician_id: clinicianId,
          specific_date: dateString,
          start_time: startTime,
          end_time: endTime,
          day_of_week: dayOfWeek,
          is_active: true,
          is_deleted: false
        });

      if (error) throw error;

      onAvailabilityUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [specificDate, clinicianId, startTime, endTime, onAvailabilityUpdated, onClose]);

  const handleDeleteClick = useCallback(async () => {
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!specificDate || !clinicianId) return;

    setIsLoading(true);
    try {
      const dateString = format(specificDate, 'yyyy-MM-dd');

      // Mark the availability exception as deleted
      const { error } = await supabase
        .from('availability_exceptions')
        .update({ is_deleted: true })
        .eq('clinician_id', clinicianId)
        .eq('specific_date', dateString);

      if (error) throw error;

      onAvailabilityUpdated();
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('Error deleting availability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [specificDate, clinicianId, onAvailabilityUpdated, onClose]);

  return {
    isLoading,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    timeOptions,
    handleSaveClick,
    handleDeleteClick,
    confirmDelete
  };
};
