
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AvailabilityBlock } from './types';
import { generateTimeOptions } from './utils';

export const useAvailabilityEdit = (
  isOpen: boolean,
  onClose: () => void,
  availabilityBlock: AvailabilityBlock | null,
  specificDate: Date | null,
  clinicianId: string | null,
  onAvailabilityUpdated: () => void
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const timeOptions = generateTimeOptions();

  // Initialize state when props change
  useEffect(() => {
    if (availabilityBlock && isOpen) {
      // Format the times from "HH:MM:SS" format to "HH:MM" format if needed
      const formattedStartTime = availabilityBlock.start_time.substring(0, 5);
      const formattedEndTime = availabilityBlock.end_time.substring(0, 5);
      
      console.log('Setting times from availability block:', {
        original: { start: availabilityBlock.start_time, end: availabilityBlock.end_time },
        formatted: { start: formattedStartTime, end: formattedEndTime }
      });
      
      setStartTime(formattedStartTime);
      setEndTime(formattedEndTime);
    }
  }, [availabilityBlock, isOpen]);

  const handleSaveClick = async () => {
    if (!clinicianId || !specificDate || !availabilityBlock) {
      toast({
        title: "Missing Information",
        description: "Unable to save availability exception. Missing required data.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const formattedDate = format(specificDate, 'yyyy-MM-dd');
      
      console.log('Saving availability exception:', {
        clinicianId,
        specificDate: formattedDate,
        originalAvailabilityId: availabilityBlock.id,
        startTime,
        endTime,
        isException: availabilityBlock.isException
      });
      
      // Check for existing exceptions first
      const { data: existingExceptions } = await supabase
        .from('availability_exceptions')
        .select('id')
        .eq('clinician_id', clinicianId)
        .eq('specific_date', formattedDate)
        .limit(1);
      
      let updateResult;
      
      if (existingExceptions && existingExceptions.length > 0) {
        // Update existing exception
        console.log('Updating existing exception:', existingExceptions[0].id);
        updateResult = await supabase
          .from('availability_exceptions')
          .update({
            start_time: startTime,
            end_time: endTime,
            is_deleted: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingExceptions[0].id);
      } else {
        // Create new exception with required fields
        console.log('Creating new exception');
        const insertData = {
          clinician_id: clinicianId,
          specific_date: formattedDate,
          start_time: startTime,
          end_time: endTime,
          is_deleted: false
        };
        
        updateResult = await supabase
          .from('availability_exceptions')
          .insert(insertData);
      }
          
      if (updateResult.error) {
        console.error('Error updating exception:', updateResult.error);
        throw updateResult.error;
      }
      
      // Wait a brief moment to ensure the database transaction completes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      toast({
        title: "Success",
        description: `Availability for ${format(specificDate, 'PPP')} has been updated.`,
      });
      
      console.log('[useAvailabilityEdit] Calling onAvailabilityUpdated to refresh calendar');
      onAvailabilityUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating availability exception:', error);
      toast({
        title: "Error",
        description: "Failed to update availability. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clinicianId || !specificDate || !availabilityBlock) {
      toast({
        title: "Missing Information",
        description: "Unable to delete availability. Missing required data.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const formattedDate = format(specificDate, 'yyyy-MM-dd');
      
      console.log('Cancelling availability:', {
        clinicianId,
        specificDate: formattedDate,
        originalAvailabilityId: availabilityBlock.id,
        isException: availabilityBlock.isException
      });
      
      // Check for existing exceptions
      const { data: existingExceptions } = await supabase
        .from('availability_exceptions')
        .select('id')
        .eq('clinician_id', clinicianId)
        .eq('specific_date', formattedDate)
        .limit(1);
      
      let updateResult;
      
      if (existingExceptions && existingExceptions.length > 0) {
        // Update existing exception to mark as deleted
        console.log('Updating existing exception to deleted:', existingExceptions[0].id);
        updateResult = await supabase
          .from('availability_exceptions')
          .update({
            is_deleted: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingExceptions[0].id);
      } else {
        // Create new exception marked as deleted with required time fields
        const insertData = {
          clinician_id: clinicianId,
          specific_date: formattedDate,
          start_time: startTime, // Use current times for deleted record
          end_time: endTime,
          is_deleted: true
        };
        
        console.log('Creating new deleted exception with data:', insertData);
        updateResult = await supabase
          .from('availability_exceptions')
          .insert(insertData);
      }
          
      if (updateResult.error) {
        console.error('Error updating exception to deleted:', updateResult.error);
        throw updateResult.error;
      }
      
      // Wait a brief moment to ensure the database transaction completes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      toast({
        title: "Success",
        description: `Availability for ${format(specificDate, 'PPP')} has been cancelled.`,
      });
      
      console.log('[useAvailabilityEdit] Calling onAvailabilityUpdated after delete to refresh calendar');
      setIsDeleteDialogOpen(false);
      onAvailabilityUpdated();
      onClose();
    } catch (error) {
      console.error('Error cancelling availability:', error);
      toast({
        title: "Error",
        description: "Failed to cancel availability. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
