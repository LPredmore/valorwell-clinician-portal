
import { useState, useCallback, useRef, useEffect } from 'react';
import { DetailedError, NylasErrorType } from '@/types/nylas';

export const useNylasError = () => {
  const [lastError, setLastError] = useState<DetailedError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const clearError = useCallback(() => {
    setLastError(null);
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    lastError,
    setLastError,
    retryCount,
    setRetryCount,
    retryTimeoutRef,
    categorizeError,
    clearError,
    hasError: !!lastError,
    isRetryable: lastError?.retryable || false,
    errorType: lastError?.type || null,
  };
};

