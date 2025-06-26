
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AvailabilityService, RecurringAvailability } from '@/utils/availabilityService';
import { useToast } from '@/hooks/use-toast';

export const useRecurringAvailability = (clinicianId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: recurringAvailability,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['recurring-availability', clinicianId],
    queryFn: () => AvailabilityService.getRecurringAvailability(clinicianId!),
    enabled: !!clinicianId,
  });

  const {
    data: syncStatus,
    isLoading: isSyncStatusLoading
  } = useQuery({
    queryKey: ['availability-sync-status', clinicianId],
    queryFn: () => AvailabilityService.getSyncStatus(clinicianId!),
    enabled: !!clinicianId,
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: ({
      dayOfWeek,
      slotNumber,
      startTime,
      endTime,
      timezone
    }: {
      dayOfWeek: string;
      slotNumber: number;
      startTime: string;
      endTime: string;
      timezone: string;
    }) => AvailabilityService.updateRecurringAvailability(
      clinicianId!,
      dayOfWeek,
      slotNumber,
      startTime,
      endTime,
      timezone
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-availability', clinicianId] });
      queryClient.invalidateQueries({ queryKey: ['availability-sync-status', clinicianId] });
      toast({
        title: "Success",
        description: "Availability updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update availability: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const removeAvailabilityMutation = useMutation({
    mutationFn: ({
      dayOfWeek,
      slotNumber
    }: {
      dayOfWeek: string;
      slotNumber: number;
    }) => AvailabilityService.removeRecurringAvailability(
      clinicianId!,
      dayOfWeek,
      slotNumber
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-availability', clinicianId] });
      queryClient.invalidateQueries({ queryKey: ['availability-sync-status', clinicianId] });
      toast({
        title: "Success",
        description: "Availability removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to remove availability: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    recurringAvailability: recurringAvailability || [],
    syncStatus: syncStatus || [],
    isLoading,
    isSyncStatusLoading,
    error,
    refetch,
    updateAvailability: updateAvailabilityMutation.mutate,
    removeAvailability: removeAvailabilityMutation.mutate,
    isUpdating: updateAvailabilityMutation.isPending,
    isRemoving: removeAvailabilityMutation.isPending,
  };
};
