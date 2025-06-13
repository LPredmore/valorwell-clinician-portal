
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface InfrastructureStatus {
  database: {
    status: 'checking' | 'ready' | 'error';
    message: string;
    details?: string;
  };
  edgeFunction: {
    status: 'checking' | 'ready' | 'error';
    message: string;
    details?: string;
  };
  secrets: {
    status: 'checking' | 'ready' | 'error';
    message: string;
    details?: string;
  };
  overall: 'checking' | 'ready' | 'error';
}

export const useNylasInfrastructureStatus = () => {
  const [status, setStatus] = useState<InfrastructureStatus>({
    database: { status: 'checking', message: 'Checking database...' },
    edgeFunction: { status: 'checking', message: 'Checking edge function...' },
    secrets: { status: 'checking', message: 'Checking configuration...' },
    overall: 'checking'
  });
  const { userId, authInitialized } = useUser();

  useEffect(() => {
    if (!authInitialized || !userId) return;

    const checkInfrastructure = async () => {
      console.log('[InfrastructureStatus] Starting infrastructure checks');
      
      // Check database connectivity and table existence
      const checkDatabase = async () => {
        try {
          const { data, error } = await supabase
            .from('nylas_connections')
            .select('id')
            .limit(1);

          if (error) {
            console.error('[InfrastructureStatus] Database error:', error);
            
            if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
              return {
                status: 'error' as const,
                message: 'Database permissions issue',
                details: 'RLS policies may not be configured correctly'
              };
            } else if (error.message?.includes('does not exist')) {
              return {
                status: 'error' as const,
                message: 'Missing database tables',
                details: 'Nylas migration needs to be applied'
              };
            } else {
              return {
                status: 'error' as const,
                message: 'Database connectivity issue',
                details: error.message
              };
            }
          }

          return {
            status: 'ready' as const,
            message: 'Database ready'
          };
        } catch (error: any) {
          console.error('[InfrastructureStatus] Database check failed:', error);
          return {
            status: 'error' as const,
            message: 'Database check failed',
            details: error.message
          };
        }
      };

      // Check edge function availability
      const checkEdgeFunction = async () => {
        try {
          // Test edge function with a simple ping-like request
          const { data, error } = await supabase.functions.invoke('nylas-auth', {
            body: { action: 'ping' }
          });

          if (error) {
            console.error('[InfrastructureStatus] Edge function error:', error);
            
            if (error.message?.includes('Failed to send a request') || error.message?.includes('does not exist')) {
              return {
                status: 'error' as const,
                message: 'Edge function not deployed',
                details: 'nylas-auth function needs to be deployed'
              };
            } else if (error.message?.includes('Nylas configuration missing')) {
              return {
                status: 'error' as const,
                message: 'Configuration missing',
                details: 'Nylas API credentials not configured'
              };
            } else {
              return {
                status: 'error' as const,
                message: 'Edge function issue',
                details: error.message
              };
            }
          }

          return {
            status: 'ready' as const,
            message: 'Edge function ready'
          };
        } catch (error: any) {
          console.error('[InfrastructureStatus] Edge function check failed:', error);
          return {
            status: 'error' as const,
            message: 'Edge function check failed',
            details: error.message
          };
        }
      };

      // Check secrets configuration (indirect check via edge function response)
      const checkSecrets = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('nylas-auth', {
            body: { action: 'check-config' }
          });

          if (error?.message?.includes('Nylas configuration missing')) {
            return {
              status: 'error' as const,
              message: 'Secrets not configured',
              details: 'NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, NYLAS_API_KEY missing'
            };
          }

          return {
            status: 'ready' as const,
            message: 'Configuration ready'
          };
        } catch (error: any) {
          return {
            status: 'error' as const,
            message: 'Configuration check failed',
            details: error.message
          };
        }
      };

      // Run all checks
      const [databaseResult, edgeFunctionResult, secretsResult] = await Promise.all([
        checkDatabase(),
        checkEdgeFunction(),
        checkSecrets()
      ]);

      const hasErrors = [databaseResult, edgeFunctionResult, secretsResult].some(
        result => result.status === 'error'
      );

      const overallStatus = hasErrors ? 'error' : 'ready';

      setStatus({
        database: databaseResult,
        edgeFunction: edgeFunctionResult,
        secrets: secretsResult,
        overall: overallStatus
      });

      console.log('[InfrastructureStatus] Check completed:', {
        database: databaseResult.status,
        edgeFunction: edgeFunctionResult.status,
        secrets: secretsResult.status,
        overall: overallStatus
      });
    };

    checkInfrastructure();
  }, [authInitialized, userId]);

  return status;
};
