import { useState, useEffect, useCallback, MutableRefObject } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';
import { NylasConnection, DetailedError, NylasErrorType } from '@/types/nylas';

interface UseNylasConnectionsProps {
  setLastError: (error: DetailedError | null) => void;
  categorizeError: (error: any, context: string) => DetailedError;
  retryCount: number;
  setRetryCount: React.Dispatch<React.SetStateAction<number>>;
  retryTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
}

export const useNylasConnections = ({
  setLastError,
  categorizeError,
  retryCount,
  setRetryCount,
  retryTimeoutRef,
}: UseNylasConnectionsProps) => {
  const [connections, setConnections] = useState<NylasConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const { userId, authInitialized } = useAuth();

  const fetchConnections = useCallback(async (forceRefresh = false) => {
    if (!authInitialized || !userId) {
      console.log('[useNylasIntegration] Skipping fetch - auth not ready or no user');
      return;
    }
    if (isLoading && !forceRefresh) return;

    if (!forceRefresh && lastFetchTime && new Date().getTime() - lastFetchTime.getTime() < 30000) {
      return;
    }

    try {
      setIsLoading(true);
      if (forceRefresh) setLastError(null);

      console.log('[useNylasIntegration] Fetching connections for user:', userId);
      
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<{data: null, error: DetailedError}>((_, reject) => {
        timeoutId = setTimeout(() => reject({
          data: null,
          error: {
            type: NylasErrorType.TIMEOUT,
            message: 'Request timed out while fetching calendar connections',
            details: 'The server took too long to respond',
            actionRequired: 'Try again later',
            retryable: true
          }
        }), 10000);
      });

      const result = await Promise.race([
        supabase
          .from('nylas_connections')
          .select('id, email, provider, is_active, created_at, calendar_ids, connector_id, grant_status, scopes, last_sync_at, last_error, sync_state')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        timeoutPromise
      ]);
      
      clearTimeout(timeoutId);
      
      const { data, error } = result;

      if (error) {
        const categorizedError = categorizeError(error, 'database');
        setLastError(categorizedError);
        toast({ title: 'Calendar Integration Error', description: categorizedError.message, variant: 'destructive' });
        
        if (categorizedError.retryable && retryCount < 3) {
          const nextRetry = Math.pow(2, retryCount) * 1000;
          console.log(`[useNylasIntegration] Retrying in ${nextRetry}ms (attempt ${retryCount + 1}/3)`);
          
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchConnections(true);
            retryTimeoutRef.current = null;
          }, nextRetry);
        }
        return;
      }

      console.log('[useNylasIntegration] Fetched connections:', data);
      setConnections(data || []);
      setLastFetchTime(new Date());
      setRetryCount(0);
    } catch (error: any) {
      const categorizedError = categorizeError(error, 'connection fetch');
      setLastError(categorizedError);
      toast({ title: 'Calendar Integration Error', description: categorizedError.message, variant: 'destructive' });
      
      if (categorizedError.retryable && retryCount < 3) {
        const nextRetry = Math.pow(2, retryCount) * 1000;
        console.log(`[useNylasIntegration] Retrying in ${nextRetry}ms (attempt ${retryCount + 1}/3)`);
        
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchConnections(true);
          retryTimeoutRef.current = null;
        }, nextRetry);
      }
    } finally {
      setIsLoading(false);
    }
  }, [authInitialized, userId, isLoading, lastFetchTime, retryCount, categorizeError, toast, setLastError, setRetryCount, retryTimeoutRef]);

  useEffect(() => {
    if (authInitialized && userId) {
      fetchConnections();
    }
  }, [authInitialized, userId, fetchConnections]);

  return {
    connections,
    setConnections,
    isLoading,
    lastUpdated: lastFetchTime,
    refreshConnections: fetchConnections,
  };
};
