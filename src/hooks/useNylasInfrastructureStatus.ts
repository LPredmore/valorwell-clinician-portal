
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface ComponentStatus {
  status: 'checking' | 'ready' | 'error';
  message: string;
  details?: string;
  actionRequired?: string;
}

interface InfrastructureStatus {
  database: ComponentStatus;
  edgeFunction: ComponentStatus;
  secrets: ComponentStatus;
  nylasApi: ComponentStatus;
  overall: 'checking' | 'ready' | 'error';
}

export const useNylasInfrastructureStatus = () => {
  const [status, setStatus] = useState<InfrastructureStatus>({
    database: { status: 'checking', message: 'Checking database...' },
    edgeFunction: { status: 'checking', message: 'Checking edge function...' },
    secrets: { status: 'checking', message: 'Checking configuration...' },
    nylasApi: { status: 'checking', message: 'Checking Nylas API...' },
    overall: 'checking'
  });
  const { userId, authInitialized } = useUser();

  useEffect(() => {
    if (!authInitialized || !userId) return;

    const checkInfrastructure = async () => {
      console.log('[InfrastructureStatus] Starting comprehensive infrastructure checks');
      
      // Check database connectivity and table existence
      const checkDatabase = async (): Promise<ComponentStatus> => {
        try {
          // Test if nylas_connections table exists and is accessible
          const { data, error } = await supabase
            .from('nylas_connections')
            .select('id')
            .limit(1);

          if (error) {
            console.error('[InfrastructureStatus] Database error:', error);
            
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
              return {
                status: 'error',
                message: 'Database tables missing',
                details: 'Nylas tables do not exist in database',
                actionRequired: 'Run database migration: 20241213000002_complete_nylas_infrastructure.sql'
              };
            } else if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
              return {
                status: 'error',
                message: 'Database permissions issue',
                details: 'RLS policies prevent access to Nylas tables',
                actionRequired: 'Fix RLS policies or run complete migration'
              };
            } else {
              return {
                status: 'error',
                message: 'Database connectivity issue',
                details: error.message,
                actionRequired: 'Check database connection and Supabase status'
              };
            }
          }

          // Test nylas_scheduler_configs table as well
          const { error: schedulerError } = await supabase
            .from('nylas_scheduler_configs')
            .select('id')
            .limit(1);

          if (schedulerError) {
            return {
              status: 'error',
              message: 'Incomplete database schema',
              details: 'Some Nylas tables are missing or inaccessible',
              actionRequired: 'Run complete database migration'
            };
          }

          return {
            status: 'ready',
            message: 'Database ready and accessible'
          };
        } catch (error: any) {
          console.error('[InfrastructureStatus] Database check failed:', error);
          return {
            status: 'error',
            message: 'Database check failed',
            details: error.message,
            actionRequired: 'Check network connection and Supabase status'
          };
        }
      };

      // Check edge function availability and basic functionality
      const checkEdgeFunction = async (): Promise<ComponentStatus> => {
        try {
          const { data, error } = await supabase.functions.invoke('nylas-auth', {
            body: { action: 'ping' }
          });

          if (error) {
            console.error('[InfrastructureStatus] Edge function error:', error);
            
            if (error.message?.includes('Failed to send a request') || 
                error.message?.includes('does not exist') ||
                error.message?.includes('FunctionsHttpError')) {
              return {
                status: 'error',
                message: 'Edge function not deployed',
                details: 'nylas-auth function is not available',
                actionRequired: 'Deploy nylas-auth edge function to Supabase'
              };
            } else {
              return {
                status: 'error',
                message: 'Edge function error',
                details: error.message,
                actionRequired: 'Check edge function logs and configuration'
              };
            }
          }

          if (data?.status === 'ok') {
            return {
              status: 'ready',
              message: 'Edge function deployed and responding'
            };
          } else {
            return {
              status: 'error',
              message: 'Edge function responding incorrectly',
              details: 'Function deployed but not returning expected response',
              actionRequired: 'Check edge function implementation'
            };
          }
        } catch (error: any) {
          console.error('[InfrastructureStatus] Edge function check failed:', error);
          return {
            status: 'error',
            message: 'Edge function check failed',
            details: error.message,
            actionRequired: 'Verify edge function deployment'
          };
        }
      };

      // Check secrets configuration
      const checkSecrets = async (): Promise<ComponentStatus> => {
        try {
          const { data, error } = await supabase.functions.invoke('nylas-auth', {
            body: { action: 'check-config' }
          });

          if (error) {
            if (error.message?.includes('Nylas configuration missing')) {
              return {
                status: 'error',
                message: 'Nylas secrets not configured',
                details: 'Missing required Nylas API credentials',
                actionRequired: 'Set NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, NYLAS_API_KEY in Supabase secrets'
              };
            } else {
              return {
                status: 'error',
                message: 'Configuration check failed',
                details: error.message,
                actionRequired: 'Check edge function and secrets configuration'
              };
            }
          }

          if (data?.status === 'ok') {
            return {
              status: 'ready',
              message: 'Nylas credentials configured and valid'
            };
          } else {
            return {
              status: 'error',
              message: 'Invalid configuration response',
              details: 'Unexpected response from configuration check',
              actionRequired: 'Verify secrets and edge function implementation'
            };
          }
        } catch (error: any) {
          return {
            status: 'error',
            message: 'Configuration check failed',
            details: error.message,
            actionRequired: 'Verify edge function deployment and secrets'
          };
        }
      };

      // Check Nylas API connectivity
      const checkNylasApi = async (): Promise<ComponentStatus> => {
        try {
          const { data, error } = await supabase.functions.invoke('nylas-auth', {
            body: { action: 'check-config' }
          });

          if (error) {
            return {
              status: 'error',
              message: 'Cannot test Nylas API',
              details: 'Configuration check failed',
              actionRequired: 'Fix configuration issues first'
            };
          }

          if (data?.api_connectivity === 'success') {
            return {
              status: 'ready',
              message: 'Nylas API connectivity verified'
            };
          } else if (data?.error?.includes('API connectivity failed')) {
            return {
              status: 'error',
              message: 'Nylas API connection failed',
              details: 'API credentials may be invalid or Nylas service unavailable',
              actionRequired: 'Verify Nylas API credentials and service status'
            };
          } else {
            return {
              status: 'ready',
              message: 'Configuration valid (API connectivity not tested)'
            };
          }
        } catch (error: any) {
          return {
            status: 'error',
            message: 'Nylas API check failed',
            details: error.message,
            actionRequired: 'Check overall system configuration'
          };
        }
      };

      // Run all checks in parallel
      const [databaseResult, edgeFunctionResult, secretsResult, nylasApiResult] = await Promise.all([
        checkDatabase(),
        checkEdgeFunction(),
        checkSecrets(),
        checkNylasApi()
      ]);

      const hasErrors = [databaseResult, edgeFunctionResult, secretsResult, nylasApiResult].some(
        result => result.status === 'error'
      );

      const overallStatus = hasErrors ? 'error' : 'ready';

      setStatus({
        database: databaseResult,
        edgeFunction: edgeFunctionResult,
        secrets: secretsResult,
        nylasApi: nylasApiResult,
        overall: overallStatus
      });

      console.log('[InfrastructureStatus] Comprehensive check completed:', {
        database: databaseResult.status,
        edgeFunction: edgeFunctionResult.status,
        secrets: secretsResult.status,
        nylasApi: nylasApiResult.status,
        overall: overallStatus
      });
    };

    checkInfrastructure();
  }, [authInitialized, userId]);

  return status;
};
