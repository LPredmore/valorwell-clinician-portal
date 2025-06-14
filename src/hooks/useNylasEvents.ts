
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimeZoneService } from '@/utils/timeZoneService';

/**
 * Interface for Nylas calendar events
 */
export interface NylasEvent {
  id: string;
  title: string;
  description?: string;
  when: {
    start_time: string;
    end_time: string;
    start_timezone?: string;
    end_timezone?: string;
  };
  connection_id: string;
  connection_email: string;
  connection_provider: string;
  calendar_id: string;
  calendar_name: string;
  status?: string;
  location?: string;
  // Additional fields for UI display
  formattedStartTime?: string;
  formattedEndTime?: string;
  formattedDate?: string;
}

/**
 * Error types for better error handling
 */
export enum NylasErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Detailed error interface for Nylas API errors
 */
interface NylasError {
  type: NylasErrorType;
  message: string;
  originalError?: any;
  retryable: boolean;
}

/**
 * Hook for fetching and managing Nylas calendar events with enhanced error handling and resilience
 */
export const useNylasEvents = (startDate?: Date, endDate?: Date, userTimezone?: string) => {
  const [events, setEvents] = useState<NylasEvent[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<NylasError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Get user's timezone or use default
  const timezone = userTimezone || TimeZoneService.DEFAULT_TIMEZONE;

  /**
   * Categorize errors for better handling and user feedback
   */
  const categorizeError = useCallback((error: any): NylasError => {
    // Default error
    const defaultError: NylasError = {
      type: NylasErrorType.UNKNOWN,
      message: 'An unknown error occurred while fetching calendar events',
      originalError: error,
      retryable: true
    };

    if (!error) return defaultError;

    const errorMessage = error.message || error.toString();
    
    // Network errors are retryable
    if (errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        error.name === 'AbortError') {
      return {
        type: NylasErrorType.NETWORK,
        message: 'Network error while connecting to calendar service',
        originalError: error,
        retryable: true
      };
    }
    
    // Authentication errors
    if (errorMessage.includes('authentication') ||
        errorMessage.includes('auth') ||
        errorMessage.includes('token') ||
        errorMessage.includes('login')) {
      return {
        type: NylasErrorType.AUTHENTICATION,
        message: 'Authentication error with calendar service',
        originalError: error,
        retryable: false
      };
    }
    
    // Authorization errors
    if (errorMessage.includes('permission') ||
        errorMessage.includes('access') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('unauthorized')) {
      return {
        type: NylasErrorType.AUTHORIZATION,
        message: 'You do not have permission to access these calendar events',
        originalError: error,
        retryable: false
      };
    }
    
    // Rate limit errors
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429')) {
      return {
        type: NylasErrorType.RATE_LIMIT,
        message: 'Rate limit exceeded for calendar service',
        originalError: error,
        retryable: true
      };
    }
    
    // Server errors
    if (errorMessage.includes('server') ||
        errorMessage.includes('500') ||
        errorMessage.includes('503')) {
      return {
        type: NylasErrorType.SERVER,
        message: 'Calendar service is experiencing issues',
        originalError: error,
        retryable: true
      };
    }
    
    return defaultError;
  }, []);

  /**
   * Format events with proper timezone handling
   */
  const formatEvents = useCallback((events: NylasEvent[]): NylasEvent[] => {
    return events.map(event => {
      try {
        // Use event timezone if available, otherwise use user timezone
        const eventTimezone = event.when.start_timezone || timezone;
        
        // Format start time
        const startDateTime = TimeZoneService.fromUTC(event.when.start_time, eventTimezone);
        const formattedStartTime = TimeZoneService.formatTime(startDateTime);
        const formattedDate = TimeZoneService.formatDate(startDateTime);
        
        // Format end time
        const endDateTime = TimeZoneService.fromUTC(event.when.end_time, eventTimezone);
        const formattedEndTime = TimeZoneService.formatTime(endDateTime);
        
        return {
          ...event,
          formattedStartTime,
          formattedEndTime,
          formattedDate
        };
      } catch (error) {
        console.error('Error formatting event times:', error);
        return event;
      }
    });
  }, [timezone]);

  /**
   * Fetch events with retry mechanism for transient failures
   */
  const fetchEvents = useCallback(async (forceRefresh = false) => {
    // Skip if already loading
    if (isLoading && !forceRefresh) return;
    
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
      setError(null);

      // Set up timeout handling
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<{data: null, error: NylasError}>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject({
            data: null,
            error: {
              type: NylasErrorType.TIMEOUT,
              message: 'Request timed out while fetching calendar events',
              retryable: true
            }
          });
        }, 15000); // 15 second timeout
      });

      const requestBody = {
        action: 'fetch_events',
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        timezone: timezone
      };

      // Race between the actual request and the timeout
      const { data, error } = await Promise.race([
        supabase.functions.invoke('nylas-events', {
          body: requestBody
        }),
        timeoutPromise
      ]);

      clearTimeout(timeoutId);

      if (error) {
        const categorizedError = categorizeError(error);
        throw categorizedError;
      }

      // Format events with proper timezone handling
      const formattedEvents = formatEvents(data?.events || []);
      
      setEvents(formattedEvents);
      setConnections(data?.connections || []);
      setLastFetchTime(new Date());
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error fetching Nylas events:', error);
      
      const categorizedError = categorizeError(error);
      setError(categorizedError);
      
      // Show appropriate toast based on error type
      toast({
        title: "Calendar Integration Error",
        description: categorizedError.message,
        variant: "destructive"
      });
      
      // Implement exponential backoff for retryable errors
      if (categorizedError.retryable && retryCount < 3) {
        const nextRetry = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying in ${nextRetry}ms (attempt ${retryCount + 1}/3)`);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchEvents(true);
        }, nextRetry);
      }
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, timezone, isLoading, lastFetchTime, retryCount, categorizeError, formatEvents, toast]);

  // Fetch events when dependencies change
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Manual refresh function with force flag
  const refetch = useCallback(() => fetchEvents(true), [fetchEvents]);

  return {
    events,
    connections,
    isLoading,
    error,
    refetch,
    // Additional helper functions
    hasError: !!error,
    errorType: error?.type || null,
    isRetryable: error?.retryable || false,
    lastUpdated: lastFetchTime
  };
};
