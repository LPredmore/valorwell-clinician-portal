
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { temporalOverlapQuery } from '@/utils/dateRangeUtils';

interface BlockedTime {
  id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  label: string;
  notes?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export const useBlockedTime = (
  clinicianId: string, 
  startDate?: Date, 
  endDate?: Date, 
  refreshTrigger = 0
) => {
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Convert Date objects to stable string representations to prevent infinite loops
  const startDateISO = useMemo(() => startDate?.toISOString(), [startDate?.getTime()]);
  const endDateISO = useMemo(() => endDate?.toISOString(), [endDate?.getTime()]);

  const fetchBlockedTimes = async () => {
    if (!clinicianId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useBlockedTime] STABLE: Fetching with stabilized dependencies:', {
        clinicianId,
        startDateISO,
        endDateISO,
        refreshTrigger
      });

      let query = supabase
        .from('blocked_time')
        .select('*')
        .eq('clinician_id', clinicianId)
        .order('start_at');

      if (startDate && endDate) {
        query = temporalOverlapQuery(query, startDate, endDate);
        console.log('[useBlockedTime] Applied temporal overlap filter:', {
          rangeStart: startDateISO,
          rangeEnd: endDateISO
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('[useBlockedTime] STABLE: Fetch results with dependencies:', {
        clinicianId,
        count: data?.length || 0,
        refreshTrigger,
        dateRange: { 
          startDateISO, 
          endDateISO 
        }
      });

      setBlockedTimes(data || []);
    } catch (error: any) {
      console.error('[useBlockedTime] Error fetching blocked times:', error);
      setError(error.message || 'Failed to fetch blocked times');
      toast({
        title: "Error",
        description: "Failed to load blocked time slots",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBlockedTime = async (
    startAt: string,
    endAt: string,
    label: string,
    notes?: string,
    timezone: string = 'America/New_York'
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blocked_time')
        .insert({
          clinician_id: clinicianId,
          start_at: startAt,
          end_at: endAt,
          label,
          notes,
          timezone
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time blocked successfully",
      });

      await fetchBlockedTimes();
      return true;
    } catch (error: any) {
      console.error('[useBlockedTime] Error creating blocked time:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create blocked time",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateBlockedTime = async (
    id: string,
    updates: {
      start_at?: string;
      end_at?: string;
      label?: string;
      notes?: string;
      timezone?: string;
    }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blocked_time')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Blocked time updated successfully",
      });

      await fetchBlockedTimes();
      return true;
    } catch (error: any) {
      console.error('[useBlockedTime] Error updating blocked time:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update blocked time",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteBlockedTime = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blocked_time')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Blocked time removed successfully",
      });

      await fetchBlockedTimes();
      return true;
    } catch (error: any) {
      console.error('[useBlockedTime] Error deleting blocked time:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete blocked time",
        variant: "destructive"
      });
      return false;
    }
  };

  // Use stabilized string dependencies instead of Date objects
  useEffect(() => {
    fetchBlockedTimes();
  }, [clinicianId, startDateISO, endDateISO, refreshTrigger]);

  return {
    blockedTimes,
    isLoading,
    error,
    createBlockedTime,
    updateBlockedTime,
    deleteBlockedTime,
    refetch: fetchBlockedTimes
  };
};
