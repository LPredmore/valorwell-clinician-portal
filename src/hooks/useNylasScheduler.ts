import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';

interface SchedulerConfig {
  id: string;
  clinician_id: string;
  scheduler_id: string;
  public_url: string | null;
  config_data: any;
  is_active: boolean;
}

export const useNylasScheduler = (clinicianId: string | null) => {
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { authInitialized } = useAuth();

  // Fetch existing scheduler configuration
  const fetchSchedulerConfig = async () => {
    if (!authInitialized || !clinicianId) {
      console.log('[useNylasScheduler] Skipping fetch - auth not ready or no clinician ID');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[useNylasScheduler] Fetching scheduler config for:', clinicianId);
      
      const { data, error } = await supabase
        .from('nylas_scheduler_configs')
        .select('*')
        .eq('clinician_id', clinicianId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[useNylasScheduler] Database error:', error);
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          toast({
            title: 'Setup Required',
            description: 'Scheduler integration is not yet configured. Please contact support.',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return;
      }

      console.log('[useNylasScheduler] Fetched scheduler config:', data);
      setSchedulerConfig(data);
    } catch (error: any) {
      console.error('[useNylasScheduler] Error fetching scheduler config:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scheduler configuration',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create new scheduler for clinician
  const createScheduler = async () => {
    if (!authInitialized || !clinicianId) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to create a scheduler',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsCreating(true);
      console.log('[useNylasScheduler] Creating scheduler for:', clinicianId);

      const { data, error } = await supabase.functions.invoke('nylas-scheduler-config', {
        body: {
          action: 'create_scheduler',
          clinicianId
        }
      });

      if (error) {
        console.error('[useNylasScheduler] Function error:', error);
        throw error;
      }

      toast({
        title: 'Scheduler Created',
        description: 'Your booking scheduler has been created successfully'
      });

      await fetchSchedulerConfig();
      return data;
    } catch (error: any) {
      console.error('[useNylasScheduler] Error creating scheduler:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create booking scheduler',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Get shareable booking URL
  const getBookingUrl = () => {
    return schedulerConfig?.public_url || null;
  };

  // Deactivate scheduler
  const deactivateScheduler = async () => {
    if (!schedulerConfig) return;

    try {
      console.log('[useNylasScheduler] Deactivating scheduler:', schedulerConfig.id);
      
      const { error } = await supabase
        .from('nylas_scheduler_configs')
        .update({ is_active: false })
        .eq('id', schedulerConfig.id);

      if (error) {
        console.error('[useNylasScheduler] Database error:', error);
        throw error;
      }

      toast({
        title: 'Scheduler Deactivated',
        description: 'Your booking scheduler has been deactivated'
      });

      setSchedulerConfig(null);
    } catch (error: any) {
      console.error('[useNylasScheduler] Error deactivating scheduler:', error);
      toast({
        title: 'Deactivation Failed',
        description: error.message || 'Failed to deactivate scheduler',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (authInitialized && clinicianId) {
      fetchSchedulerConfig();
    }
  }, [authInitialized, clinicianId]);

  return {
    schedulerConfig,
    isLoading,
    isCreating,
    createScheduler,
    deactivateScheduler,
    getBookingUrl,
    refreshConfig: fetchSchedulerConfig
  };
};
