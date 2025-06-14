
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

