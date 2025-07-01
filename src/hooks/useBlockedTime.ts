
import { useState, useEffect } from 'react';
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

export const useBlockedTime = (clinicianId: string, startDate?: Date, endDate?: Date) => {
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBlockedTimes = async () => {
    if (!clinicianId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useBlockedTime] Fetching blocked times with FIXED temporal overlap query:', {
        clinicianId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        queryType: 'temporal_overlap'
      });

      let query = supabase
        .from('blocked_time')
        .select('*')
        .eq('clinician_id', clinicianId)
        .order('start_at');

      // FIXED: Use proper temporal overlap instead of just checking start_at
      if (startDate && endDate) {
        query = temporalOverlapQuery(query, startDate, endDate);
        console.log('[useBlockedTime] Applied temporal overlap filter:', {
          rangeStart: startDate.toISOString(),
          rangeEnd: endDate.toISOString(),
          logic: 'blocked_start <= range_end AND blocked_end >= range_start'
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('[useBlockedTime] FIXED fetch results:', {
        clinicianId,
        count: data?.length || 0,
        dateRange: { 
          startDate: startDate?.toISOString(), 
          endDate: endDate?.toISOString() 
        },
        retrievedBlocks: data?.map(bt => ({
          id: bt.id,
          label: bt.label,
          start_at: bt.start_at,
          end_at: bt.end_at,
          spans_range: startDate && endDate ? 
            (new Date(bt.start_at) <= endDate && new Date(bt.end_at) >= startDate) : 'N/A'
        }))
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

      // Refresh the data
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

      // Refresh the data
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

      // Refresh the data
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

  useEffect(() => {
    fetchBlockedTimes();
  }, [clinicianId, startDate, endDate]);

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
