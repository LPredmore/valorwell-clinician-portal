/**
 * Synced Event Types
 * 
 * This file contains types for WebSocket-based real-time calendar updates.
 * It extends the types from calendarSync.ts to provide specific types for
 * real-time event handling.
 */

import { SyncedEvent as BaseSyncedEvent } from './calendarSync';
import { Appointment } from './appointment';

/**
 * Real-time Event Type
 * Defines the types of real-time events that can be received via WebSockets
 */
export enum RealTimeEventType {
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_UPDATED = 'appointment_updated',
  APPOINTMENT_DELETED = 'appointment_deleted',
  SYNCED_EVENT_CREATED = 'synced_event_created',
  SYNCED_EVENT_UPDATED = 'synced_event_updated',
  SYNCED_EVENT_DELETED = 'synced_event_deleted',
  CONNECTION_ESTABLISHED = 'connection_established',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_CLOSED = 'connection_closed',
  HEARTBEAT = 'heartbeat'
}

/**
 * Real-time Event Payload
 * Base interface for all real-time event payloads
 */
export interface RealTimeEventPayload {
  timestamp: string;
  sender?: string;
}

/**
 * Appointment Event Payload
 * Payload for appointment-related real-time events
 */
export interface AppointmentEventPayload extends RealTimeEventPayload {
  appointment: Appointment;
}

/**
 * Synced Event Payload
 * Payload for synced event-related real-time events
 */
export interface SyncedEventPayload extends RealTimeEventPayload {
  syncedEvent: BaseSyncedEvent;
}

/**
 * Connection Event Payload
 * Payload for connection-related real-time events
 */
export interface ConnectionEventPayload extends RealTimeEventPayload {
  status: string;
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

/**
 * Real-time Event
 * Represents a real-time event received via WebSockets
 */
export interface RealTimeEvent<T extends RealTimeEventPayload> {
  type: RealTimeEventType;
  payload: T;
}

/**
 * Real-time Event Handler
 * Function type for handling real-time events
 */
export type RealTimeEventHandler<T extends RealTimeEventPayload> = (event: RealTimeEvent<T>) => void;

/**
 * Real-time Event Subscription
 * Represents a subscription to real-time events
 */
export interface RealTimeEventSubscription {
  unsubscribe: () => void;
}

/**
 * Real-time Connection Status
 * Represents the status of a WebSocket connection
 */
export enum RealTimeConnectionStatus {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

/**
 * Real-time Connection Options
 * Options for configuring a WebSocket connection
 */
export interface RealTimeConnectionOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

/**
 * Extended SyncedEvent interface with real-time specific fields
 */
export interface SyncedEvent extends BaseSyncedEvent {
  // Additional fields for real-time updates
  lastRealTimeUpdate?: string;
  realTimeUpdateSource?: string;
  pendingChanges?: boolean;
  conflictStatus?: 'none' | 'local' | 'remote' | 'resolved';
}

/**
 * Real-time Update Notification
 * Visual notification for real-time updates
 */
export interface RealTimeUpdateNotification {
  id: string;
  type: RealTimeEventType;
  message: string;
  timestamp: string;
  read: boolean;
  entityId?: string;
  entityType?: 'appointment' | 'synced_event';
}

/**
 * Real-time Update Indicator Status
 * Status of the real-time update indicator
 */
export interface RealTimeIndicatorStatus {
  isConnected: boolean;
  connectionStatus: RealTimeConnectionStatus;
  lastUpdateTimestamp?: string;
  pendingUpdates: number;
  hasNotifications: boolean;
  unreadNotifications: number;
}

export default SyncedEvent;