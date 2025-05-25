/**
 * WebSocket Connection Manager
 * 
 * This module provides a centralized WebSocket connection manager for real-time calendar updates.
 * It handles connection establishment, authentication, heartbeat, reconnection, and message processing.
 */

import { supabase } from "@/integrations/supabase/client";
import { Appointment } from "@/types/appointment";
import { SyncedEvent } from "@/types/calendarSync";
import { CalendarDebugUtils } from "@/utils/calendarDebugUtils";

// Component name for logging
const COMPONENT_NAME = 'WebSocketManager';

// WebSocket event types for calendar updates
export enum WebSocketEventType {
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_UPDATED = 'appointment_updated',
  APPOINTMENT_DELETED = 'appointment_deleted',
  SYNCED_EVENT_UPDATED = 'synced_event_updated',
  CONNECTION_ESTABLISHED = 'connection_established',
  CONNECTION_ERROR = 'connection_error',
  CONNECTION_CLOSED = 'connection_closed',
  HEARTBEAT = 'heartbeat'
}

// WebSocket message interface
export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: any;
  timestamp: string;
  sender?: string;
}

// WebSocket connection options
export interface WebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

// Default options
const DEFAULT_OPTIONS: WebSocketOptions = {
  autoReconnect: true,
  reconnectInterval: 3000, // 3 seconds
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000, // 30 seconds
  debug: false
};

// Event callback type
type EventCallback = (data: any) => void;

/**
 * WebSocket Manager Class
 * 
 * Manages WebSocket connections for real-time calendar updates
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private options: WebSocketOptions;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private eventListeners: Map<WebSocketEventType, Set<EventCallback>> = new Map();
  private isConnecting = false;
  private userId: string | null = null;
  private authToken: string | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(options: WebSocketOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Initialize event listener collections
    Object.values(WebSocketEventType).forEach(eventType => {
      this.eventListeners.set(eventType as WebSocketEventType, new Set());
    });
  }

  /**
   * Get the singleton instance of WebSocketManager
   */
  public static getInstance(options?: WebSocketOptions): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(options);
    } else if (options) {
      // Update options if provided
      WebSocketManager.instance.options = { ...WebSocketManager.instance.options, ...options };
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize the WebSocket connection with authentication
   */
  public async initialize(): Promise<boolean> {
    if (this.socket || this.isConnecting) {
      return true; // Already connected or connecting
    }

    try {
      this.isConnecting = true;
      
      // Get current user and session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        CalendarDebugUtils.error(COMPONENT_NAME, 'No active session found for WebSocket authentication');
        this.isConnecting = false;
        return false;
      }

      this.userId = session.user.id;
      this.authToken = session.access_token;
      
      return this.connect();
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error initializing WebSocket connection', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Connect to the WebSocket server
   */
  private connect(): boolean {
    try {
      // Construct WebSocket URL with authentication token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.VITE_SUPABASE_URL.replace('https://', '').replace('http://', '');
      const url = `${protocol}//${host}/realtime/v1/websocket?token=${this.authToken}`;
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'Connecting to WebSocket server', { userId: this.userId });
      
      this.socket = new WebSocket(url);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      
      return true;
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error connecting to WebSocket server', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    CalendarDebugUtils.log(COMPONENT_NAME, 'WebSocket connection established');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Subscribe to calendar channels
    this.subscribeToCalendarChannels();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Notify listeners
    this.notifyListeners(WebSocketEventType.CONNECTION_ESTABLISHED, { timestamp: new Date().toISOString() });
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (this.options.debug) {
        CalendarDebugUtils.log(COMPONENT_NAME, 'WebSocket message received', data);
      }
      
      // Handle different message types
      if (data.type === 'broadcast' && data.payload) {
        // Handle broadcast messages from Supabase Realtime
        this.handleBroadcastMessage(data.payload);
      } else if (data.type === 'heartbeat') {
        // Handle heartbeat response
        this.notifyListeners(WebSocketEventType.HEARTBEAT, { timestamp: new Date().toISOString() });
      }
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error parsing WebSocket message', error);
    }
  }

  /**
   * Handle broadcast messages from Supabase Realtime
   */
  private handleBroadcastMessage(payload: any): void {
    // Determine the event type based on the payload
    let eventType: WebSocketEventType;
    let eventPayload: any;
    
    if (payload.table === 'appointments') {
      if (payload.type === 'INSERT') {
        eventType = WebSocketEventType.APPOINTMENT_CREATED;
      } else if (payload.type === 'UPDATE') {
        eventType = WebSocketEventType.APPOINTMENT_UPDATED;
      } else if (payload.type === 'DELETE') {
        eventType = WebSocketEventType.APPOINTMENT_DELETED;
      } else {
        return; // Unknown event type
      }
      
      eventPayload = payload.new || payload.old;
    } else if (payload.table === 'synced_events') {
      eventType = WebSocketEventType.SYNCED_EVENT_UPDATED;
      eventPayload = payload.new || payload.old;
    } else {
      return; // Unknown table
    }
    
    // Notify listeners
    this.notifyListeners(eventType, eventPayload);
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    CalendarDebugUtils.error(COMPONENT_NAME, 'WebSocket error occurred', event);
    this.notifyListeners(WebSocketEventType.CONNECTION_ERROR, { timestamp: new Date().toISOString(), event });
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    CalendarDebugUtils.log(COMPONENT_NAME, 'WebSocket connection closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    this.socket = null;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    // Notify listeners
    this.notifyListeners(WebSocketEventType.CONNECTION_CLOSED, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      timestamp: new Date().toISOString()
    });
    
    // Attempt to reconnect if enabled
    if (this.options.autoReconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts || 0)) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval || 3000;
    
    CalendarDebugUtils.log(COMPONENT_NAME, `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = window.setTimeout(() => {
      CalendarDebugUtils.log(COMPONENT_NAME, `Attempting to reconnect (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  /**
   * Start the heartbeat timer
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
    }
    
    const interval = this.options.heartbeatInterval || 30000;
    
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }

  /**
   * Stop the heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send a heartbeat message to keep the connection alive
   */
  private sendHeartbeat(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Subscribe to calendar-related channels in Supabase Realtime
   */
  private subscribeToCalendarChannels(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Subscribe to appointments table changes for the current user
    this.socket.send(JSON.stringify({
      type: 'subscribe',
      table: 'appointments',
      schema: 'public',
      filter: this.userId ? `clinician_id=eq.${this.userId}` : undefined
    }));
    
    // Subscribe to synced_events table changes for the current user
    this.socket.send(JSON.stringify({
      type: 'subscribe',
      table: 'synced_events',
      schema: 'public',
      filter: this.userId ? `connection_id=in.(select id from calendar_connections where user_id=eq.${this.userId})` : undefined
    }));
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'Subscribed to calendar channels', { userId: this.userId });
  }

  /**
   * Add an event listener
   */
  public addEventListener(eventType: WebSocketEventType, callback: EventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(callback);
    }
  }

  /**
   * Remove an event listener
   */
  public removeEventListener(eventType: WebSocketEventType, callback: EventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(eventType: WebSocketEventType, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          CalendarDebugUtils.error(COMPONENT_NAME, `Error in event listener for ${eventType}`, error);
        }
      });
    }
  }

  /**
   * Send a message through the WebSocket
   */
  public sendMessage(message: Partial<WebSocketMessage>): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Cannot send message, WebSocket is not open');
      return false;
    }
    
    try {
      const fullMessage: WebSocketMessage = {
        type: message.type!,
        payload: message.payload || {},
        timestamp: message.timestamp || new Date().toISOString(),
        sender: this.userId || undefined
      };
      
      this.socket.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error sending WebSocket message', error);
      return false;
    }
  }

  /**
   * Close the WebSocket connection
   */
  public disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.close(1000, 'User initiated disconnect');
      this.socket = null;
    }
    
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'WebSocket connection manually disconnected');
  }

  /**
   * Check if the WebSocket is currently connected
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get the current connection state
   */
  public getConnectionState(): string {
    if (!this.socket) {
      return 'DISCONNECTED';
    }
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'DISCONNECTED';
      default:
        return 'UNKNOWN';
    }
  }
}

// Export a singleton instance
export const websocketManager = WebSocketManager.getInstance();

// Export default for direct imports
export default websocketManager;