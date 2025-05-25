/**
 * Real-time Event Handler
 * 
 * This module provides handlers for processing incoming WebSocket messages
 * related to calendar updates. It handles appointment creation, modification,
 * deletion, and synced event updates.
 */

import { Appointment } from "@/types/appointment";
import { SyncedEvent } from "@/types/calendarSync";
import { WebSocketEventType } from "@/utils/websocketManager";
import { CalendarDebugUtils } from "@/utils/calendarDebugUtils";

// Component name for logging
const COMPONENT_NAME = 'RealTimeEventHandler';

// Event handler callback types
export type AppointmentEventHandler = (appointment: Appointment) => void;
export type SyncedEventHandler = (syncedEvent: SyncedEvent) => void;
export type ConnectionEventHandler = (connectionInfo: any) => void;

// Event handler registry
interface EventHandlerRegistry {
  [WebSocketEventType.APPOINTMENT_CREATED]: Set<AppointmentEventHandler>;
  [WebSocketEventType.APPOINTMENT_UPDATED]: Set<AppointmentEventHandler>;
  [WebSocketEventType.APPOINTMENT_DELETED]: Set<AppointmentEventHandler>;
  [WebSocketEventType.SYNCED_EVENT_UPDATED]: Set<SyncedEventHandler>;
  [WebSocketEventType.CONNECTION_ESTABLISHED]: Set<ConnectionEventHandler>;
  [WebSocketEventType.CONNECTION_ERROR]: Set<ConnectionEventHandler>;
  [WebSocketEventType.CONNECTION_CLOSED]: Set<ConnectionEventHandler>;
  [WebSocketEventType.HEARTBEAT]: Set<ConnectionEventHandler>;
}

/**
 * Real-time Event Handler Class
 * 
 * Manages event handlers for real-time calendar updates
 */
export class RealTimeEventHandler {
  private static instance: RealTimeEventHandler;
  private handlers: EventHandlerRegistry;
  private lastProcessedEvents: Map<string, { timestamp: number, data: any }> = new Map();
  private processingQueue: Array<{ type: WebSocketEventType, data: any }> = [];
  private isProcessing: boolean = false;
  private deduplicationWindow: number = 2000; // 2 seconds deduplication window

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize handler registry
    this.handlers = {
      [WebSocketEventType.APPOINTMENT_CREATED]: new Set(),
      [WebSocketEventType.APPOINTMENT_UPDATED]: new Set(),
      [WebSocketEventType.APPOINTMENT_DELETED]: new Set(),
      [WebSocketEventType.SYNCED_EVENT_UPDATED]: new Set(),
      [WebSocketEventType.CONNECTION_ESTABLISHED]: new Set(),
      [WebSocketEventType.CONNECTION_ERROR]: new Set(),
      [WebSocketEventType.CONNECTION_CLOSED]: new Set(),
      [WebSocketEventType.HEARTBEAT]: new Set()
    };
  }

  /**
   * Get the singleton instance of RealTimeEventHandler
   */
  public static getInstance(): RealTimeEventHandler {
    if (!RealTimeEventHandler.instance) {
      RealTimeEventHandler.instance = new RealTimeEventHandler();
    }
    return RealTimeEventHandler.instance;
  }

  /**
   * Register a handler for appointment created events
   */
  public onAppointmentCreated(handler: AppointmentEventHandler): () => void {
    this.handlers[WebSocketEventType.APPOINTMENT_CREATED].add(handler);
    return () => this.handlers[WebSocketEventType.APPOINTMENT_CREATED].delete(handler);
  }

  /**
   * Register a handler for appointment updated events
   */
  public onAppointmentUpdated(handler: AppointmentEventHandler): () => void {
    this.handlers[WebSocketEventType.APPOINTMENT_UPDATED].add(handler);
    return () => this.handlers[WebSocketEventType.APPOINTMENT_UPDATED].delete(handler);
  }

  /**
   * Register a handler for appointment deleted events
   */
  public onAppointmentDeleted(handler: AppointmentEventHandler): () => void {
    this.handlers[WebSocketEventType.APPOINTMENT_DELETED].add(handler);
    return () => this.handlers[WebSocketEventType.APPOINTMENT_DELETED].delete(handler);
  }

  /**
   * Register a handler for synced event updated events
   */
  public onSyncedEventUpdated(handler: SyncedEventHandler): () => void {
    this.handlers[WebSocketEventType.SYNCED_EVENT_UPDATED].add(handler);
    return () => this.handlers[WebSocketEventType.SYNCED_EVENT_UPDATED].delete(handler);
  }

  /**
   * Register a handler for connection established events
   */
  public onConnectionEstablished(handler: ConnectionEventHandler): () => void {
    this.handlers[WebSocketEventType.CONNECTION_ESTABLISHED].add(handler);
    return () => this.handlers[WebSocketEventType.CONNECTION_ESTABLISHED].delete(handler);
  }

  /**
   * Register a handler for connection error events
   */
  public onConnectionError(handler: ConnectionEventHandler): () => void {
    this.handlers[WebSocketEventType.CONNECTION_ERROR].add(handler);
    return () => this.handlers[WebSocketEventType.CONNECTION_ERROR].delete(handler);
  }

  /**
   * Register a handler for connection closed events
   */
  public onConnectionClosed(handler: ConnectionEventHandler): () => void {
    this.handlers[WebSocketEventType.CONNECTION_CLOSED].add(handler);
    return () => this.handlers[WebSocketEventType.CONNECTION_CLOSED].delete(handler);
  }

  /**
   * Register a handler for heartbeat events
   */
  public onHeartbeat(handler: ConnectionEventHandler): () => void {
    this.handlers[WebSocketEventType.HEARTBEAT].add(handler);
    return () => this.handlers[WebSocketEventType.HEARTBEAT].delete(handler);
  }

  /**
   * Process an incoming WebSocket event
   * This method is called by the WebSocketManager when a message is received
   */
  public processEvent(type: WebSocketEventType, data: any): void {
    // Add to processing queue
    this.processingQueue.push({ type, data });
    
    // Start processing if not already in progress
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Process events in order
      while (this.processingQueue.length > 0) {
        const event = this.processingQueue.shift();
        if (event) {
          await this.handleEvent(event.type, event.data);
        }
      }
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error processing event queue', error);
    } finally {
      this.isProcessing = false;
      
      // Check if more events were added while processing
      if (this.processingQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Handle a single event
   */
  private async handleEvent(type: WebSocketEventType, data: any): Promise<void> {
    // Generate event ID for deduplication
    const eventId = this.generateEventId(type, data);
    
    // Check for duplicate events within the deduplication window
    if (this.isDuplicate(eventId, data)) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Skipping duplicate event', { type, eventId });
      return;
    }
    
    // Process based on event type
    switch (type) {
      case WebSocketEventType.APPOINTMENT_CREATED:
      case WebSocketEventType.APPOINTMENT_UPDATED:
      case WebSocketEventType.APPOINTMENT_DELETED:
        this.handleAppointmentEvent(type, data);
        break;
        
      case WebSocketEventType.SYNCED_EVENT_UPDATED:
        this.handleSyncedEventUpdate(data);
        break;
        
      case WebSocketEventType.CONNECTION_ESTABLISHED:
      case WebSocketEventType.CONNECTION_ERROR:
      case WebSocketEventType.CONNECTION_CLOSED:
      case WebSocketEventType.HEARTBEAT:
        this.handleConnectionEvent(type, data);
        break;
        
      default:
        CalendarDebugUtils.warn(COMPONENT_NAME, 'Unknown event type', { type });
    }
  }

  /**
   * Handle appointment-related events
   */
  private handleAppointmentEvent(type: WebSocketEventType, data: any): void {
    if (!data || typeof data !== 'object') {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Invalid appointment data', { type, data });
      return;
    }
    
    try {
      // Validate and normalize appointment data
      const appointment = this.normalizeAppointmentData(data);
      
      // Notify handlers
      this.notifyHandlers(type, appointment);
      
      CalendarDebugUtils.log(COMPONENT_NAME, `Processed ${type}`, {
        appointmentId: appointment.id,
        clientId: appointment.client_id,
        clinicianId: appointment.clinician_id
      });
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, `Error handling ${type}`, error);
    }
  }

  /**
   * Handle synced event updates
   */
  private handleSyncedEventUpdate(data: any): void {
    if (!data || typeof data !== 'object') {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Invalid synced event data', { data });
      return;
    }
    
    try {
      // Validate and normalize synced event data
      const syncedEvent = this.normalizeSyncedEventData(data);
      
      // Notify handlers
      this.notifyHandlers(WebSocketEventType.SYNCED_EVENT_UPDATED, syncedEvent);
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'Processed synced event update', {
        syncedEventId: syncedEvent.id,
        externalEventId: syncedEvent.externalEventId
      });
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error handling synced event update', error);
    }
  }

  /**
   * Handle connection-related events
   */
  private handleConnectionEvent(type: WebSocketEventType, data: any): void {
    try {
      // Notify handlers
      this.notifyHandlers(type, data);
      
      CalendarDebugUtils.log(COMPONENT_NAME, `Processed ${type}`, {
        timestamp: data.timestamp
      });
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, `Error handling ${type}`, error);
    }
  }

  /**
   * Notify all registered handlers for an event type
   */
  private notifyHandlers(type: WebSocketEventType, data: any): void {
    const handlers = this.handlers[type];
    if (handlers && handlers.size > 0) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          CalendarDebugUtils.error(COMPONENT_NAME, `Error in handler for ${type}`, error);
        }
      });
    }
  }

  /**
   * Normalize appointment data to ensure it matches the Appointment interface
   */
  private normalizeAppointmentData(data: any): Appointment {
    // Ensure required fields are present
    if (!data.id || !data.client_id || !data.clinician_id || !data.start_at || !data.end_at) {
      throw new Error('Missing required appointment fields');
    }
    
    // Return normalized appointment data
    return {
      id: data.id,
      client_id: data.client_id,
      clinician_id: data.clinician_id,
      start_at: data.start_at,
      end_at: data.end_at,
      type: data.type || '',
      status: data.status || '',
      video_room_url: data.video_room_url || null,
      notes: data.notes || null,
      appointment_recurring: data.appointment_recurring || null,
      recurring_group_id: data.recurring_group_id || null,
      client: data.client || undefined,
      clientName: data.clientName || undefined,
      billing: data.billing || undefined,
      audit: data.audit || undefined
    };
  }

  /**
   * Normalize synced event data to ensure it matches the SyncedEvent interface
   */
  private normalizeSyncedEventData(data: any): SyncedEvent {
    // Ensure required fields are present
    if (!data.id || !data.connection_id || !data.external_event_id || !data.external_calendar_id || 
        !data.start_at || !data.end_at) {
      throw new Error('Missing required synced event fields');
    }
    
    // Return normalized synced event data
    return {
      id: data.id,
      connectionId: data.connection_id,
      localAppointmentId: data.local_appointment_id || null,
      externalEventId: data.external_event_id,
      externalCalendarId: data.external_calendar_id,
      title: data.title || '',
      description: data.description || null,
      location: data.location || null,
      startAt: data.start_at,
      endAt: data.end_at,
      allDay: data.all_day || false,
      recurrenceRule: data.recurrence_rule || null,
      status: data.status as any || 'confirmed',
      lastSyncedAt: data.last_synced_at,
      lastModifiedAt: data.last_modified_at,
      externalLastModifiedAt: data.external_last_modified_at,
      syncStatus: data.sync_status as any || 'synced',
      syncError: data.sync_error || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Generate a unique ID for an event for deduplication purposes
   */
  private generateEventId(type: WebSocketEventType, data: any): string {
    let id = '';
    
    switch (type) {
      case WebSocketEventType.APPOINTMENT_CREATED:
      case WebSocketEventType.APPOINTMENT_UPDATED:
      case WebSocketEventType.APPOINTMENT_DELETED:
        id = `${type}:${data.id}`;
        break;
        
      case WebSocketEventType.SYNCED_EVENT_UPDATED:
        id = `${type}:${data.id}`;
        break;
        
      case WebSocketEventType.CONNECTION_ESTABLISHED:
      case WebSocketEventType.CONNECTION_ERROR:
      case WebSocketEventType.CONNECTION_CLOSED:
      case WebSocketEventType.HEARTBEAT:
        id = `${type}:${data.timestamp || new Date().toISOString()}`;
        break;
        
      default:
        id = `${type}:${JSON.stringify(data)}`;
    }
    
    return id;
  }

  /**
   * Check if an event is a duplicate within the deduplication window
   */
  private isDuplicate(eventId: string, data: any): boolean {
    const now = Date.now();
    const lastProcessed = this.lastProcessedEvents.get(eventId);
    
    // If we've seen this event recently, it's a duplicate
    if (lastProcessed && (now - lastProcessed.timestamp) < this.deduplicationWindow) {
      return true;
    }
    
    // Record this event
    this.lastProcessedEvents.set(eventId, { timestamp: now, data });
    
    // Clean up old events
    this.cleanupOldEvents(now);
    
    return false;
  }

  /**
   * Clean up events older than the deduplication window
   */
  private cleanupOldEvents(now: number): void {
    const cutoff = now - this.deduplicationWindow;
    
    for (const [eventId, eventData] of this.lastProcessedEvents.entries()) {
      if (eventData.timestamp < cutoff) {
        this.lastProcessedEvents.delete(eventId);
      }
    }
  }

  /**
   * Set the deduplication window in milliseconds
   */
  public setDeduplicationWindow(milliseconds: number): void {
    this.deduplicationWindow = milliseconds;
  }

  /**
   * Clear all event handlers
   */
  public clearHandlers(): void {
    Object.values(WebSocketEventType).forEach(type => {
      this.handlers[type as WebSocketEventType].clear();
    });
  }
}

// Export a singleton instance
export const realTimeEventHandler = RealTimeEventHandler.getInstance();

// Export default for direct imports
export default realTimeEventHandler;