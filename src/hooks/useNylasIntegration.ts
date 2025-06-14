
import { useNylasError } from './useNylasError';
import { useNylasConnections } from './useNylasConnections';
import { useNylasAuthFlow } from './useNylasAuthFlow';

export * from '@/types/nylas';

/**
 * Hook for managing Nylas calendar integration with enhanced resilience.
 * This hook composes functionality from more focused hooks:
 * - useNylasError: For error state management and categorization.
 * - useNylasConnections: for fetching and managing connection data.
 * - useNylasAuthFlow: for handling user-facing connection/disconnection logic.
 */
export const useNylasIntegration = () => {
  const {
    lastError,
    setLastError,
    categorizeError,
    clearError,
    hasError,
    isRetryable,
    errorType,
    retryCount,
    setRetryCount,
    retryTimeoutRef,
  } = useNylasError();
  
  const {
    connections,
    setConnections,
    isLoading,
    lastUpdated,
    refreshConnections
  } = useNylasConnections({
    setLastError,
    categorizeError,
    retryCount,
    setRetryCount,
    retryTimeoutRef,
  });

  const {
    isConnecting,
    connectGoogleCalendar,
    disconnectCalendar
  } = useNylasAuthFlow({
    connections,
    setConnections,
    refreshConnections,
    setLastError,
    categorizeError,
    clearError,
  });

  return {
    // State
    connections,
    isLoading,
    isConnecting,
    lastError,
    hasError,
    errorType,
    isRetryable,
    lastUpdated,

    // Actions
    clearError,
    connectCalendar: connectGoogleCalendar,
    connectGoogleCalendar,
    disconnectCalendar,
    refreshConnections,

    // Legacy compatibility
    infrastructureError: lastError?.message || null,
  };
};

