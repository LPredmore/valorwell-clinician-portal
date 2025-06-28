
import { useQuery } from '@tanstack/react-query';
import { filterRealAppointments } from '@/utils/clientFilterUtils';

// Global safe query wrapper that automatically filters blocked time from all data
export const useSafeQuery = (queryKey: any[], queryFn: () => Promise<any>) => {
  const safeQueryFn = async () => {
    const data = await queryFn();
    // Apply filtering to prevent blocked time leakage
    if (Array.isArray(data)) {
      return filterRealAppointments(data);
    }
    return data;
  };
  
  return useQuery({
    queryKey,
    queryFn: safeQueryFn,
  });
};

// Safe client query wrapper
export const useSafeClientQuery = (queryKey: any[], queryFn: () => Promise<any>) => {
  const safeQueryFn = async () => {
    const data = await queryFn();
    // Apply client filtering to prevent blocked time client leakage
    if (Array.isArray(data)) {
      const { filterRealClients } = await import('@/utils/clientFilterUtils');
      return filterRealClients(data);
    }
    return data;
  };
  
  return useQuery({
    queryKey,
    queryFn: safeQueryFn,
  });
};

// Verification function to detect blocked time leaks
export const testBlockedTimeLeak = async () => {
  try {
    const { BLOCKED_TIME_CLIENT_ID } = await import('@/utils/blockedTimeUtils');
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: clients } = await supabase
      .from('clients')
      .select('id, client_first_name, client_last_name')
      .eq('id', BLOCKED_TIME_CLIENT_ID);
    
    if (clients && clients.length > 0) {
      console.warn('⚠️ BLOCKED TIME LEAK DETECTED in clients table!', clients);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error testing blocked time leak:', error);
    return false;
  }
};
