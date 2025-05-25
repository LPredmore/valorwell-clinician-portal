/**
 * Calendar Synchronization Types
 * This file contains types for two-way calendar synchronization with external services
 */

import { Appointment } from './appointment';

/**
 * External Calendar Service Types
 * Supported external calendar services
 */
export enum ExternalCalendarType {
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
  APPLE = 'apple',
  GENERIC_ICAL = 'ical'
}

/**
 * Synchronization Status
 * Represents the current status of a calendar synchronization
 */
export enum SyncStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  SYNCING = 'syncing',
  ERROR = 'error',
  PAUSED = 'paused'
}

/**
 * Conflict Resolution Strategy
 * Defines how conflicts between local and external calendars should be resolved
 */
export enum ConflictResolutionStrategy {
  LOCAL_WINS = 'local_wins',
  EXTERNAL_WINS = 'external_wins',
  MANUAL = 'manual',
  NEWEST_WINS = 'newest_wins'
}

/**
 * Sync Direction
 * Defines the direction of synchronization
 */
export enum SyncDirection {
  BIDIRECTIONAL = 'bidirectional',
  TO_EXTERNAL = 'to_external',
  FROM_EXTERNAL = 'from_external'
}

/**
 * Sync Frequency
 * Defines how often synchronization should occur
 */
export enum SyncFrequency {
  REALTIME = 'realtime',
  HOURLY = 'hourly',
  DAILY = 'daily',
  MANUAL = 'manual'
}

/**
 * Calendar Connection
 * Represents a connection to an external calendar service
 */
export interface CalendarConnection {
  id: string;
  userId: string;
  calendarType: ExternalCalendarType;
  calendarId: string;
  calendarName: string;
  status: SyncStatus;
  lastSyncedAt: string | null;
  conflictStrategy: ConflictResolutionStrategy;
  syncDirection: SyncDirection;
  syncFrequency: SyncFrequency;
  syncRange: {
    pastDays: number;
    futureDays: number;
  };
  filterTags?: string[];
  filterAppointmentTypes?: string[];
  createdAt: string;
  updatedAt: string;
  // Authentication details - specific to each provider
  authDetails: GoogleAuthDetails | OutlookAuthDetails | AppleAuthDetails | null;
}

/**
 * Google Calendar Authentication Details
 */
export interface GoogleAuthDetails {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
}

/**
 * Microsoft Outlook Authentication Details
 */
export interface OutlookAuthDetails {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
}

/**
 * Apple Calendar Authentication Details
 */
export interface AppleAuthDetails {
  token: string;
  expiresAt: string;
}

/**
 * Synced Event
 * Represents an event that has been synchronized with an external calendar
 */
export interface SyncedEvent {
  id: string;
  connectionId: string;
  localAppointmentId: string | null;
  externalEventId: string;
  externalCalendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  recurrenceRule: string | null;
  status: 'confirmed' | 'tentative' | 'cancelled';
  lastSyncedAt: string;
  lastModifiedAt: string;
  externalLastModifiedAt: string;
  syncStatus: 'synced' | 'pending_update' | 'pending_delete' | 'conflict' | 'error';
  syncError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync Conflict
 * Represents a conflict between local and external calendars
 */
export interface SyncConflict {
  id: string;
  connectionId: string;
  syncedEventId: string;
  localAppointmentId: string | null;
  externalEventId: string;
  conflictType: 'time_conflict' | 'data_conflict' | 'deletion_conflict';
  localData: Partial<Appointment>;
  externalData: Partial<SyncedEvent>;
  resolutionStrategy: ConflictResolutionStrategy;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync Log Entry
 * Represents a log entry for synchronization activities
 */
export interface SyncLogEntry {
  id: string;
  connectionId: string;
  timestamp: string;
  eventType: 'sync_started' | 'sync_completed' | 'sync_failed' | 'event_created' | 'event_updated' | 'event_deleted' | 'conflict_detected' | 'conflict_resolved';
  details: Record<string, any>;
  error: string | null;
}

/**
 * Calendar Connector Interface
 * Common interface for all external calendar connectors
 */
export interface CalendarConnector {
  // Connection management
  connect(userId: string, authCode: string): Promise<CalendarConnection>;
  disconnect(connectionId: string): Promise<boolean>;
  refreshAuth(connectionId: string): Promise<boolean>;
  
  // Calendar operations
  listCalendars(connectionId: string): Promise<{id: string, name: string}[]>;
  
  // Event operations
  fetchEvents(connectionId: string, startDate: string, endDate: string): Promise<SyncedEvent[]>;
  createEvent(connectionId: string, appointment: Appointment): Promise<SyncedEvent>;
  updateEvent(connectionId: string, syncedEvent: SyncedEvent, appointment: Appointment): Promise<SyncedEvent>;
  deleteEvent(connectionId: string, syncedEvent: SyncedEvent): Promise<boolean>;
  
  // Sync operations
  startSync(connectionId: string): Promise<void>;
  stopSync(connectionId: string): Promise<void>;
  getSyncStatus(connectionId: string): Promise<SyncStatus>;
}

/**
 * Calendar Import/Export Format
 * Supported formats for calendar data import/export
 */
export enum CalendarFormat {
  ICAL = 'ical',
  CSV = 'csv',
  JSON = 'json'
}

/**
 * Import/Export Options
 * Options for importing/exporting calendar data
 */
export interface ImportExportOptions {
  format: CalendarFormat;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  appointmentTypes?: string[];
  includeClientInfo?: boolean;
  includeNotes?: boolean;
  includeCancelled?: boolean;
}

/**
 * Import Result
 * Result of a calendar import operation
 */
export interface ImportResult {
  totalEvents: number;
  importedEvents: number;
  skippedEvents: number;
  importedData?: any[]; // Array of imported appointment data
  errors: Array<{
    index: number;
    error: string;
    eventData?: any;
  }>;
}

/**
 * Export Result
 * Result of a calendar export operation
 */
export interface ExportResult {
  fileName: string;
  fileSize: number;
  eventCount: number;
  format: CalendarFormat;
}