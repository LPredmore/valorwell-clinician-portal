
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AvailabilityBlock } from './types';
import { generateTimeOptions } from './utils';

/**
 * Hook for editing clinician availability
 * Refactored to update clinician data directly instead of using exceptions
 */
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
      const formattedStartTime = availabilityBlock.start_time?.substring(0, 5) || '09:00';
      const formattedEndTime = availabilityBlock.end_time?.substring(0, 5) || '17:00';
      
      console.log('Setting times from availability block:', {
        original: { start: availabilityBlock.start_time, end: availabilityBlock.end_time },
        formatted: { start: formattedStartTime, end: formattedEndTime }
      });
      
      setStartTime(formattedStartTime);
      setEndTime(formattedEndTime);
    }
  }, [availabilityBlock, isOpen]);

  /**
   * Extract day and slot from availability block ID
   * @param id The availability block ID (format: clinician-{id}-{day}-{slot})
   * @returns An object with day and slot
   */
  const extractDayAndSlot = (id: string): { day: string, slot: number } | null => {
    // Parse the ID to extract day and slot
    // Expected format: clinician-{id}-{day}-{slot}
    const parts = id.split('-');
    if (parts.length < 4) return null;
    
    return {
      day: parts[2],
      slot: parseInt(parts[3], 10)
    };
  };

  /**
   * Save availability changes directly to the clinician record
   */
  const handleSaveClick = async () => {
    if (!clinicianId || !availabilityBlock) {
      toast({
        title: "Missing Information",
        description: "Unable to save availability. Missing required data.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Saving availability:', {
        clinicianId,
        availabilityBlockId: availabilityBlock.id,
        startTime,
        endTime
      });
      
      // Extract day and slot from the availability block ID
      const dayAndSlot = extractDayAndSlot(availabilityBlock.id);
      
      if (!dayAndSlot) {
        throw new Error(`Invalid availability block ID format: ${availabilityBlock.id}`);
      }
      
      const { day, slot } = dayAndSlot;
      
      // Create an update object with the specific columns to update
      const updateData: Record<string, any> = {};
      updateData[`clinician_availability_start_${day}_${slot}`] = startTime;
      updateData[`clinician_availability_end_${day}_${slot}`] = endTime;
      
      // Update the clinician record
      const { error } = await supabase
        .from('clinicians')
        .update(updateData)
        .eq('id', clinicianId);
        
      if (error) {
        console.error('Error updating clinician availability:', error);
        throw error;
      }
      
      // Wait a brief moment to ensure the database transaction completes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Only show success toast if no errors
      toast({
        title: "Success",
        description: "Availability updated successfully.",
      });
      
      // Notify parent component that availability was updated
      onAvailabilityUpdated();
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
      
      toast({
        title: "Error",
        description: "There was an error saving your availability changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete availability by setting start and end times to null
   */
  const handleDeleteClick = async () => {
    setIsDeleteDialogOpen(true);
  };

  /**
   * Confirm delete availability
   */
  const confirmDelete = async () => {
    if (!clinicianId || !availabilityBlock) {
      toast({
        title: "Missing Information",
        description: "Unable to delete availability. Missing required data.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Deleting availability:', {
        clinicianId,
        availabilityBlockId: availabilityBlock.id
      });
      
      // Extract day and slot from the availability block ID
      const dayAndSlot = extractDayAndSlot(availabilityBlock.id);
      
      if (!dayAndSlot) {
        throw new Error(`Invalid availability block ID format: ${availabilityBlock.id}`);
      }
      
      const { day, slot } = dayAndSlot;
      
      // Create an update object with the specific columns to update
      const updateData: Record<string, any> = {};
      updateData[`clinician_availability_start_${day}_${slot}`] = null;
      updateData[`clinician_availability_end_${day}_${slot}`] = null;
      
      // Update the clinician record
      const { error } = await supabase
        .from('clinicians')
        .update(updateData)
        .eq('id', clinicianId);
        
      if (error) {
        console.error('Error deleting clinician availability:', error);
        throw error;
      }
      
      // Wait a brief moment to ensure the database transaction completes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Only show success toast if no errors
      toast({
        title: "Success",
        description: "Availability deleted successfully.",
      });
      
      // Notify parent component that availability was updated
      onAvailabilityUpdated();
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error('Error deleting availability:', error);
      
      toast({
        title: "Error",
        description: "There was an error deleting your availability. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return {
    isLoading,
    startTime,
    endTime,
    timeOptions,
    isDeleteDialogOpen,
    setStartTime,
    setEndTime,
    setIsDeleteDialogOpen,
    handleSaveClick,
    handleDeleteClick,
    confirmDelete
  };
};
