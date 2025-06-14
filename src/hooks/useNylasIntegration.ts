import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';
import { TimeZoneService } from '@/utils/timeZoneService';

/**
 * Interface for Nylas calendar connections
 */
export interface NylasConnection {
  id: string;
  email: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  calendar_ids?: string[];
  connector_id?: string;
  grant_status?: string;
  scopes?: string[];
  last_sync_at?: string;
  last_error?: string;
  sync_state?: 'running' | 'stopped' | 'error';
}

/**
 * Enhanced error types for better error handling and user feedback
 */
export enum NylasErrorType {
  DATABASE = 'database',
  EDGE_FUNCTION = 'edge_function',
  OAUTH = 'oauth',
  CONFIGURATION = 'configuration',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

/**
 * Detailed error interface with actionable information
 */
export interface DetailedError {
  type: NylasErrorType;
  message: string;
  details?: string;
  actionRequired?: string;
  retryable: boolean;
  originalError?: any;
}

/**
 * Hook for managing Nylas calendar integration with enhanced resilience
 */
export const useNylasIntegration = () => {
  const [connections, setConnections] = useState<NylasConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<DetailedError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const { userId, authInitialized } = useAuth();
  
  // Ref to track active retries
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for callback success messages with improved error handling
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data?.type === 'NYLAS_AUTH_SUCCESS') {
          console.log('[useNylasIntegration] Received Google Calendar auth success message');
          setIsConnecting(false);
          setLastError(null);
          setRetryCount(0);
          
          toast({
            title: 'Google Calendar Connected',
            description: 'Successfully connected your Google Calendar via Nylas',
            variant: 'default'
          });
          
          // Fetch connections with a slight delay to ensure backend sync is complete
          setTimeout(() => {
            fetchConnections(true);
          }, 1000);
        } else if (event.data?.type === 'NYLAS_AUTH_ERROR') {
          // Handle explicit error messages from the OAuth flow
          console.error('[useNylasIntegration] Received OAuth error:', event.data.error);
          
          const errorDetails: DetailedError = {
            type: NylasErrorType.OAUTH,
            message: 'Calendar authorization failed',
            details: event.data.error?.message || 'OAuth flow returned an error',
            actionRequired: 'Please try again or contact support',
            retryable: true,
            originalError: event.data.error
          };
          
          setLastError(errorDetails);
          setIsConnecting(false);
          
          toast({
            title: 'Calendar Connection Failed',
            description: errorDetails.message,
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('[useNylasIntegration] Error handling message event:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

  /**
   * Enhanced error categorization with retry information
   */
  const categorizeError = useCallback((error: any, context: string): DetailedError => {
    console.error(`[useNylasIntegration] ${context} error:`, error);

    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    // Database errors
    if (error.code === 'PGRST301' || errorMessage.includes('permission denied')) {
      return {
        type: NylasErrorType.DATABASE,
        message: 'Database permission denied',
        details: 'RLS policies may not be configured correctly',
        actionRequired: 'Run database migration to fix RLS policies',
        retryable: false
      };
    }

    if (errorMessage.includes('does not exist') && context === 'database') {
      return {
        type: NylasErrorType.DATABASE,
        message: 'Database tables missing',
        details: 'Nylas tables do not exist',
        actionRequired: 'Apply Nylas database migration',
        retryable: false
      };
    }

    // Edge function errors
    if (errorMessage.includes('Failed to send a request') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('function not found')) {
      return {
        type: NylasErrorType.EDGE_FUNCTION,
        message: 'Edge function not available',
        details: 'nylas-auth function is not deployed',
        actionRequired: 'Deploy nylas-auth edge function',
        retryable: false
      };
    }

    // Configuration errors
    if (errorMessage.includes('Nylas configuration missing') || 
        errorMessage.includes('credentials') || 
        errorMessage.includes('API key')) {
      return {
        type: NylasErrorType.CONFIGURATION,
        message: 'Nylas credentials missing',
        details: 'API credentials not configured in Supabase secrets',
        actionRequired: 'Set NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, NYLAS_API_KEY in Supabase secrets',
        retryable: false
      };
    }

    // OAuth errors
    if (errorMessage.includes('authorization') || 
        errorMessage.includes('oauth') || 
        errorMessage.includes('token')) {
      return {
        type: NylasErrorType.OAUTH,
        message: 'OAuth authorization failed',
        details: errorMessage,
        actionRequired: 'Check OAuth configuration and redirect URLs',
        retryable: true
      };
    }

    // Network errors
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection') || 
        errorMessage.includes('internet')) {
      return {
        type: NylasErrorType.NETWORK,
        message: 'Network connection issue',
        details: 'Could not connect to the server',
        actionRequired: 'Check your internet connection and try again',
        retryable: true
      };
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('timed out')) {
      return {
        type: NylasErrorType.TIMEOUT,
        message: 'Request timed out',
        details: 'The server took too long to respond',
        actionRequired: 'Try again later',
        retryable: true
      };
    }

    // Rate limit errors
    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests') || 
        errorMessage.includes('429')) {
      return {
        type: NylasErrorType.RATE_LIMIT,
        message: 'Rate limit exceeded',
        details: 'Too many requests to the calendar service',
        actionRequired: 'Please wait a moment before trying again',
        retryable: true
      };
    }

    // Default categorization
    return {
      type: NylasErrorType.UNKNOWN,
      message: `${context} failed`,
      details: errorMessage,
      actionRequired: 'Check logs for more details',
      retryable: true,
      originalError: error
    };
  }, []);

  /**
   * Fetch user's calendar connections with retry mechanism
   */
  const fetchConnections = useCallback(async (forceRefresh = false) => {
    // Skip if not authenticated or already loading
    if (!authInitialized || !userId) {
      console.log('[useNylasIntegration] Skipping fetch - auth not ready or no user');
      return;
    }

    if (isLoading && !forceRefresh) {
      return;
    }
    
    // Implement cache control - don't refetch if less than 30 seconds since last fetch
    // unless forceRefresh is true
    if (!forceRefresh && lastFetchTime) {
      const timeSinceLastFetch = new Date().getTime() - lastFetchTime.getTime();
      if (timeSinceLastFetch < 30000) { // 30 seconds
        return;
      }
    }

    try {
      setIsLoading(true);
      
      // Only clear error if this is a manual refresh
      if (forceRefresh) {
        setLastError(null);
      }
      
      console.log('[useNylasIntegration] Fetching connections for user:', userId);
      
      // Set up timeout handling
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<{data: null, error: DetailedError}>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject({
            data: null,
            error: {
              type: NylasErrorType.TIMEOUT,
              message: 'Request timed out while fetching calendar connections',
              details: 'The server took too long to respond',
              actionRequired: 'Try again later',
              retryable: true
            }
          });
        }, 10000); // 10 second timeout
      });
      
      // Race between the actual request and the timeout
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
        
        toast({
          title: 'Calendar Integration Error',
          description: categorizedError.message,
          variant: 'destructive'
        });
        
        // Implement exponential backoff for retryable errors
        if (categorizedError.retryable && retryCount < 3) {
          const nextRetry = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`[useNylasIntegration] Retrying in ${nextRetry}ms (attempt ${retryCount + 1}/3)`);
          
          // Clear any existing retry timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
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
      setRetryCount(0); // Reset retry count on success
    } catch (error: any) {
      const categorizedError = categorizeError(error, 'connection fetch');
      setLastError(categorizedError);
      
      toast({
        title: 'Calendar Integration Error',
        description: categorizedError.message,
        variant: 'destructive'
      });
      
      // Implement exponential backoff for retryable errors
      if (categorizedError.retryable && retryCount < 3) {
        const nextRetry = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`[useNylasIntegration] Retrying in ${nextRetry}ms (attempt ${retryCount + 1}/3)`);
        
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchConnections(true);
          retryTimeoutRef.current = null;
        }, nextRetry);
      }
    } finally {
      setIsLoading(false);
    }
  }, [authInitialized, userId, isLoading, lastFetchTime, retryCount, categorizeError, toast]);

  /**
   * Initialize Google Calendar connection via Nylas with enhanced error handling
   */
  const connectGoogleCalendar = useCallback(async () => {
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (!authInitialized || !userId) {
      const error: DetailedError = {
        type: NylasErrorType.OAUTH,
        message: 'Authentication required',
        details: 'User must be logged in to connect calendar',
        actionRequired: 'Please log in first',
        retryable: false
      };
      setLastError(error);
      toast({
        title: 'Authentication Required',
        description: 'Please log in to connect Google Calendar',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsConnecting(true);
      setLastError(null);
      console.log('[useNylasIntegration] Initializing Google Calendar connection via Nylas');

      // Set up timeout handling
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<{data: null, error: DetailedError}>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject({
            data: null,
            error: {
              type: NylasErrorType.TIMEOUT,
              message: 'Request timed out while initializing calendar connection',
              details: 'The server took too long to respond',
              actionRequired: 'Try again later',
              retryable: true
            }
          });
        }, 15000); // 15 second timeout
      });
      
      // Race between the actual request and the timeout
      const result = await Promise.race([
        supabase.functions.invoke('nylas-auth', {
          body: { 
            action: 'initialize',
            timezone: TimeZoneService.ensureIANATimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
          }
        }),
        timeoutPromise
      ]);
      
      clearTimeout(timeoutId);
      
      const { data, error } = result;

      if (error) {
        const categorizedError = categorizeError(error, 'edge function');
        setLastError(categorizedError);
        
        toast({
          title: 'Connection Failed',
          description: categorizedError.message,
          variant: 'destructive'
        });
        setIsConnecting(false);
        return;
      }

      if (data?.authUrl) {
        console.log('[useNylasIntegration] Opening Google OAuth window via Nylas');
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          const error: DetailedError = {
            type: NylasErrorType.OAUTH,
            message: 'Popup blocked',
            details: 'Browser blocked the popup window',
            actionRequired: 'Allow popups for this site and try again',
            retryable: true
          };
          setLastError(error);
          toast({
            title: 'Popup Blocked',
            description: 'Please allow popups and try again.',
            variant: 'destructive'
          });
          setIsConnecting(false);
          return;
        }

        // Monitor popup closure with improved handling
        const checkClosed = setInterval(() => {
          try {
            if (popup?.closed) {
              clearInterval(checkClosed);
              
              // If we didn't receive a success message within 1 second of closing,
              // assume the user closed the popup without completing the flow
              setTimeout(() => {
                if (isConnecting) {
                  setIsConnecting(false);
                  
                  // Only show this message if we didn't get a success message
                  if (!connections.some(conn => conn.provider === 'google')) {
                    toast({
                      title: 'Connection Cancelled',
                      description: 'Calendar connection was cancelled or unsuccessful',
                      variant: 'default'
                    });
                  }
                }
              }, 1000);
            }
          } catch (error) {
            console.error('[useNylasIntegration] Error checking popup state:', error);
            clearInterval(checkClosed);
            setIsConnecting(false);
          }
        }, 1000);
      } else {
        const error: DetailedError = {
          type: NylasErrorType.EDGE_FUNCTION,
          message: 'No authorization URL received',
          details: 'Edge function did not return auth URL',
          actionRequired: 'Check edge function logs',
          retryable: true
        };
        setLastError(error);
        setIsConnecting(false);
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      const categorizedError = categorizeError(error, 'OAuth initialization');
      setLastError(categorizedError);
      
      toast({
        title: 'Connection Failed',
        description: categorizedError.message,
        variant: 'destructive'
      });
      setIsConnecting(false);
    }
  }, [authInitialized, userId, isConnecting, connections, categorizeError, toast]);

  /**
   * Disconnect calendar with enhanced error handling
   */
  const disconnectCalendar = useCallback(async (connectionId: string) => {
    try {
      console.log('[useNylasIntegration] Disconnecting calendar:', connectionId);
      
      // Set up timeout handling
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<{data: null, error: DetailedError}>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject({
            data: null,
            error: {
              type: NylasErrorType.TIMEOUT,
              message: 'Request timed out while disconnecting calendar',
              details: 'The server took too long to respond',
              actionRequired: 'Try again later',
              retryable: true
            }
          });
        }, 10000); // 10 second timeout
      });
      
      // Race between the actual request and the timeout
      const result = await Promise.race([
        supabase.functions.invoke('nylas-auth', {
          body: {
            action: 'disconnect',
            connectionId
          }
        }),
        timeoutPromise
      ]);
      
      clearTimeout(timeoutId);
      
      const { error } = result;

      if (error) {
        const categorizedError = categorizeError(error, 'disconnect');
        setLastError(categorizedError);
        throw error;
      }

      setLastError(null);
      toast({
        title: 'Calendar Disconnected',
        description: 'Google Calendar has been successfully disconnected'
      });

      // Update the local state immediately for better UX
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      
      // Then fetch the latest from the server
      setTimeout(() => {
        fetchConnections(true);
      }, 500);
    } catch (error: any) {
      console.error('[useNylasIntegration] Error disconnecting calendar:', error);
      const categorizedError = categorizeError(error, 'disconnect');
      
      toast({
        title: 'Disconnection Failed',
        description: categorizedError.message,
        variant: 'destructive'
      });
    }
  }, [categorizeError, fetchConnections, toast]);

  /**
   * Clear error state and cancel any pending retries
   */
  const clearError = useCallback(() => {
    setLastError(null);
    setRetryCount(0);
    
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Cleanup function to clear any timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Initial fetch when auth is ready
  useEffect(() => {
    if (authInitialized && userId) {
      fetchConnections();
    }
  }, [authInitialized, userId, fetchConnections]);

  return {
    connections,
    isLoading,
    isConnecting,
    lastError,
    clearError,
    connectCalendar: connectGoogleCalendar,
    connectGoogleCalendar,
    disconnectCalendar,
    refreshConnections: fetchConnections,
    // Additional helper properties
    hasError: !!lastError,
    errorType: lastError?.type || null,
    isRetryable: lastError?.retryable || false,
    lastUpdated: lastFetchTime,
    // Legacy compatibility
    infrastructureError: lastError?.message || null
  };
};
