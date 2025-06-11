
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Fetch existing scheduler configuration
  const fetchSchedulerConfig = async () => {
    if (!clinicianId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('nylas_scheduler_configs')
        .select('*')
        .eq('clinician_id', clinicianId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSchedulerConfig(data);
    } catch (error) {
    } catch (error: any) {
      console.error('Error fetching scheduler config:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduler configuration",
        variant: "destructive"
      });
      if (error?.status === 406) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this scheduler',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load scheduler configuration',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Create new scheduler for clinician
  const createScheduler = async () => {
    if (!clinicianId) return;

    try {
      setIsCreating(true);
      

      const { data, error } = await supabase.functions.invoke('nylas-scheduler-config', {
        body: { 
        body: {
          action: 'create_scheduler',
          clinicianId 
          clinicianId
        }
      });

      if (error) throw error;

      toast({
        title: "Scheduler Created",
        description: "Your booking scheduler has been created successfully"
        title: 'Scheduler Created',
        description: 'Your booking scheduler has been created successfully'
      });

      // Refresh the configuration
      await fetchSchedulerConfig();
      
      return data;
    } catch (error) {
    } catch (error: any) {
      console.error('Error creating scheduler:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create booking scheduler",
        variant: "destructive"
      });
      if (error?.status === 406) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to create a scheduler',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Creation Failed',
          description: 'Failed to create booking scheduler',
          variant: 'destructive'
        });
      }
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
      const { error } = await supabase
        .from('nylas_scheduler_configs')
        .update({ is_active: false })
        .eq('id', schedulerConfig.id);

      if (error) throw error;

      toast({
        title: "Scheduler Deactivated",
        description: "Your booking scheduler has been deactivated"
        title: 'Scheduler Deactivated',
        description: 'Your booking scheduler has been deactivated'
      });

      setSchedulerConfig(null);
    } catch (error) {
    } catch (error: any) {
      console.error('Error deactivating scheduler:', error);
      toast({
        title: "Deactivation Failed",
        description: "Failed to deactivate scheduler",
        variant: "destructive"
      });
      if (error?.status === 406) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to deactivate this scheduler',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Deactivation Failed',
          description: 'Failed to deactivate scheduler',
          variant: 'destructive'
        });
      }
    }
  };

  useEffect(() => {
    fetchSchedulerConfig();
  }, [clinicianId]);

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
