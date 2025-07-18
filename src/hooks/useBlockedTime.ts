import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { temporalOverlapQuery } from '@/utils/dateRangeUtils';
// Removed getClinicianTimeZone import - using browser timezone only
import { DateTime } from 'luxon';

// Helper function to validate Date objects
const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

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
  timeZone?: string,
  refreshTrigger = 0
) => {
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBlockedTimes = async () => {
    if (!clinicianId) return;
    
    // Use browser timezone if no timezone provided
    const effectiveTimeZone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Validate dates before processing
    if (startDate && !isValidDate(startDate)) {
      console.log('[useBlockedTime] GUARD: Skipping fetch - invalid startDate');
      return;
    }
    
    if (endDate && !isValidDate(endDate)) {
      console.log('[useBlockedTime] GUARD: Skipping fetch - invalid endDate');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useBlockedTime] SIMPLE: Fetching UTC data for conversion:', {
        clinicianId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        refreshTrigger
      });

      let query = supabase
        .from('blocked_time')
        .select('*')
        .eq('clinician_id', clinicianId)
        .order('start_at');

      if (startDate && endDate) {
        // Convert boundaries to UTC using effective timezone before query
        const startUTC = DateTime.fromJSDate(startDate, { zone: effectiveTimeZone })
          .startOf('day').toUTC().toJSDate();
        const endUTC = DateTime.fromJSDate(endDate, { zone: effectiveTimeZone })
          .endOf('day').plus({ days: 1 }).toUTC().toJSDate();
          
        // Validate converted dates before using them
        if (!isValidDate(startUTC) || !isValidDate(endUTC)) {
          console.error('[useBlockedTime] ERROR: Invalid UTC conversion results');
          return;
        }
          
        query = temporalOverlapQuery(query, startUTC, endUTC);
        console.log('[useBlockedTime] Applied temporal overlap filter with timezone conversion:', {
          originalStart: startDate.toISOString(),
          originalEnd: endDate.toISOString(),
          utcStart: startUTC.toISOString(),
          utcEnd: endUTC.toISOString(),
          timezone: effectiveTimeZone
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('[useBlockedTime] CRITICAL: Fetch results with dependencies:', {
        clinicianId,
        count: data?.length || 0,
        refreshTrigger,
        dateRange: { 
          startDate: startDate?.toISOString(), 
          endDate: endDate?.toISOString() 
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
    notes?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blocked_time')
        .insert({
          clinician_id: clinicianId,
          start_at: startAt,
          end_at: endAt,
          label,
          notes
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
    console.log('[useBlockedTime] Starting deleteBlockedTime:', { id, clinicianId });
    
    try {
      // First verify the blocked time exists and belongs to the clinician
      const { data: existingData, error: selectError } = await supabase
        .from('blocked_time')
        .select('id, clinician_id, label')
        .eq('id', id)
        .single();
      
      if (selectError) {
        console.error('[useBlockedTime] Error verifying blocked time exists:', selectError);
        throw selectError;
      }
      
      if (!existingData) {
        console.error('[useBlockedTime] Blocked time not found:', { id });
        throw new Error('Blocked time not found');
      }
      
      console.log('[useBlockedTime] Verified blocked time exists:', existingData);

      const { error, data } = await supabase
        .from('blocked_time')
        .delete()
        .eq('id', id)
        .select(); // Return deleted data for verification

      if (error) {
        console.error('[useBlockedTime] Delete operation failed:', error);
        throw error;
      }

      console.log('[useBlockedTime] Delete operation completed:', { deletedData: data });

      toast({
        title: "Success",
        description: "Blocked time removed successfully",
      });

      // Delay refetch to prevent race conditions
      setTimeout(() => {
        fetchBlockedTimes();
      }, 200);
      
      return true;
    } catch (error: any) {
      console.error('[useBlockedTime] Error deleting blocked time:', {
        error: error.message,
        id,
        clinicianId,
        code: error.code,
        details: error.details
      });
      toast({
        title: "Error",
        description: error.message || "Failed to delete blocked time",
        variant: "destructive"
      });
      return false;
    }
  };

  // Include timezone in dependencies to trigger refetch when timezone changes
  useEffect(() => {
    fetchBlockedTimes();
  }, [clinicianId, startDate, endDate, timeZone, refreshTrigger]);

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
