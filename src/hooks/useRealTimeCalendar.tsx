/**
 * useRealTimeCalendar Hook
 * 
 * This hook provides real-time calendar updates via WebSockets.
 * It integrates with the WebSocketManager and RealTimeEventHandler
 * to provide a simple interface for components to subscribe to calendar updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Appointment } from '@/types/appointment';
import { SyncedEvent } from '@/types/calendarSync';
import { websocketManager, WebSocketEventType } from '@/utils/websocketManager';
import { realTimeEventHandler } from '@/utils/realTimeEventHandler';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'useRealTimeCalendar';

// Hook options interface
export interface UseRealTimeCalendarOptions {
  autoConnect?: boolean;
  onAppointmentCreated?: (appointment: Appointment) => void;
  onAppointmentUpdated?: (appointment: Appointment) => void;
  onAppointmentDeleted?: (appointment: Appointment) => void;
  onSyncedEventUpdated?: (syncedEvent: SyncedEvent) => void;
  onConnectionChange?: (status: string) => void;
  enableToasts?: boolean;
  debug?: boolean;
}

/**
 * Hook for real-time calendar updates
 */
export const useRealTimeCalendar = (options: UseRealTimeCalendarOptions = {}) => {
  // Default options
  const {
    autoConnect = true,
    onAppointmentCreated,
    onAppointmentUpdated,
    onAppointmentDeleted,
    onSyncedEventUpdated,
    onConnectionChange,
    enableToasts = true,
    debug = false
  } = options;

  // State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<string>('DISCONNECTED');
  const [lastEvent, setLastEvent] = useState<{ type: string, timestamp: string } | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<number>(0);
  
  // Refs to track cleanup functions
  const cleanupFunctions = useRef<Array<() => void>>([]);
  
  // Toast for notifications
  const { toast } = useToast();

  /**
   * Show a toast notification if enabled
   */
  const showToast = useCallback((title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    if (enableToasts) {
      toast({
        title,
        description,
        variant
      });
    }
  }, [enableToasts, toast]);

  /**
   * Handle connection state changes
   */
  const handleConnectionChange = useCallback((status: string) => {
    setConnectionState(status);
    setIsConnected(status === 'CONNECTED');
    
    if (onConnectionChange) {
      onConnectionChange(status);
    }
    
    if (debug) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Connection state changed', { status });
    }
  }, [onConnectionChange, debug]);

  /**
   * Handle appointment created events
   */
  const handleAppointmentCreated = useCallback((appointment: Appointment) => {
    setLastEvent({
      type: WebSocketEventType.APPOINTMENT_CREATED,
      timestamp: new Date().toISOString()
    });
    
    setPendingUpdates(prev => prev + 1);
    
    if (onAppointmentCreated) {
      onAppointmentCreated(appointment);
    }
    
    if (enableToasts) {
      showToast(
        'New Appointment',
        `Appointment for ${appointment.clientName || 'a client'} was created.`
      );
    }
    
    setPendingUpdates(prev => prev - 1);
    
    if (debug) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment created', {
        appointmentId: appointment.id,
        clientName: appointment.clientName
      });
    }
  }, [onAppointmentCreated, enableToasts, showToast, debug]);

  /**
   * Handle appointment updated events
   */
  const handleAppointmentUpdated = useCallback((appointment: Appointment) => {
    setLastEvent({
      type: WebSocketEventType.APPOINTMENT_UPDATED,
      timestamp: new Date().toISOString()
    });
    
    setPendingUpdates(prev => prev + 1);
    
    if (onAppointmentUpdated) {
      onAppointmentUpdated(appointment);
    }
    
    if (enableToasts) {
      showToast(
        'Appointment Updated',
        `Appointment for ${appointment.clientName || 'a client'} was updated.`
      );
    }
    
    setPendingUpdates(prev => prev - 1);
    
    if (debug) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment updated', {
        appointmentId: appointment.id,
        clientName: appointment.clientName
      });
    }
  }, [onAppointmentUpdated, enableToasts, showToast, debug]);

  /**
   * Handle appointment deleted events
   */
  const handleAppointmentDeleted = useCallback((appointment: Appointment) => {
    setLastEvent({
      type: WebSocketEventType.APPOINTMENT_DELETED,
      timestamp: new Date().toISOString()
    });
    
    setPendingUpdates(prev => prev + 1);
    
    if (onAppointmentDeleted) {
      onAppointmentDeleted(appointment);
    }
    
    if (enableToasts) {
      showToast(
        'Appointment Cancelled',
        `Appointment for ${appointment.clientName || 'a client'} was cancelled.`,
        'destructive'
      );
    }
    
    setPendingUpdates(prev => prev - 1);
    
    if (debug) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment deleted', {
        appointmentId: appointment.id,
        clientName: appointment.clientName
      });
    }
  }, [onAppointmentDeleted, enableToasts, showToast, debug]);

  /**
   * Handle synced event updated events
   */
  const handleSyncedEventUpdated = useCallback((syncedEvent: SyncedEvent) => {
    setLastEvent({
      type: WebSocketEventType.SYNCED_EVENT_UPDATED,
      timestamp: new Date().toISOString()
    });
    
    setPendingUpdates(prev => prev + 1);
    
    if (onSyncedEventUpdated) {
      onSyncedEventUpdated(syncedEvent);
    }
    
    setPendingUpdates(prev => prev - 1);
    
    if (debug) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Synced event updated', {
        syncedEventId: syncedEvent.id,
        title: syncedEvent.title
      });
    }
  }, [onSyncedEventUpdated, debug]);

  /**
   * Handle connection established events
   */
  const handleConnectionEstablished = useCallback((data: any) => {
    setLastEvent({
      type: WebSocketEventType.CONNECTION_ESTABLISHED,
      timestamp: data.timestamp || new Date().toISOString()
    });
    
    handleConnectionChange('CONNECTED');
    
    if (enableToasts) {
      showToast(
        'Connected',
        'Real-time calendar updates are now active.'
      );
    }
    
    if (debug) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Connection established', {
        timestamp: data.timestamp
      });
    }
  }, [handleConnectionChange, enableToasts, showToast, debug]);

  /**
   * Handle connection error events
   */
  const handleConnectionError = useCallback((data: any) => {
    setLastEvent({
      type: WebSocketEventType.CONNECTION_ERROR,
      timestamp: data.timestamp || new Date().toISOString()
    });
    
    handleConnectionChange('ERROR');
    
    if (enableToasts) {
      showToast(
        'Connection Error',
        'There was an error with the real-time connection. Some updates may be delayed.',
        'destructive'
      );
    }
    
    if (debug) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Connection error', data);
    }
  }, [handleConnectionChange, enableToasts, showToast, debug]);

  /**
   * Handle connection closed events
   */
  const handleConnectionClosed = useCallback((data: any) => {
    setLastEvent({
      type: WebSocketEventType.CONNECTION_CLOSED,
      timestamp: data.timestamp || new Date().toISOString()
    });
    
    handleConnectionChange('DISCONNECTED');
    
    if (data.code !== 1000 && enableToasts) { // 1000 is normal closure
      showToast(
        'Connection Lost',
        'Real-time connection was lost. Attempting to reconnect...',
        'destructive'
      );
    }
    
    if (debug) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Connection closed', {
        code: data.code,
        reason: data.reason,
        wasClean: data.wasClean
      });
    }
  }, [handleConnectionChange, enableToasts, showToast, debug]);

  /**
   * Handle heartbeat events
   */
  const handleHeartbeat = useCallback((data: any) => {
    setLastEvent({
      type: WebSocketEventType.HEARTBEAT,
      timestamp: data.timestamp || new Date().toISOString()
    });
    
    if (debug) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Heartbeat received', {
        timestamp: data.timestamp
      });
    }
  }, [debug]);

  /**
   * Initialize WebSocket connection and event handlers
   */
  useEffect(() => {
    // Register event handlers
    const unregisterFunctions: Array<() => void> = [];
    
    // Connection event handlers
    unregisterFunctions.push(
      realTimeEventHandler.onConnectionEstablished(handleConnectionEstablished),
      realTimeEventHandler.onConnectionError(handleConnectionError),
      realTimeEventHandler.onConnectionClosed(handleConnectionClosed),
      realTimeEventHandler.onHeartbeat(handleHeartbeat)
    );
    
    // Calendar event handlers
    unregisterFunctions.push(
      realTimeEventHandler.onAppointmentCreated(handleAppointmentCreated),
      realTimeEventHandler.onAppointmentUpdated(handleAppointmentUpdated),
      realTimeEventHandler.onAppointmentDeleted(handleAppointmentDeleted),
      realTimeEventHandler.onSyncedEventUpdated(handleSyncedEventUpdated)
    );
    
    // Store cleanup functions
    cleanupFunctions.current = unregisterFunctions;
    
    // Connect to WebSocket if autoConnect is enabled
    if (autoConnect) {
      connectWebSocket();
    }
    
    // Update initial connection state
    setConnectionState(websocketManager.getConnectionState());
    setIsConnected(websocketManager.isConnected());
    
    // Cleanup on unmount
    return () => {
      // Unregister all event handlers
      unregisterFunctions.forEach(cleanup => cleanup());
    };
  }, [
    autoConnect,
    handleConnectionEstablished,
    handleConnectionError,
    handleConnectionClosed,
    handleHeartbeat,
    handleAppointmentCreated,
    handleAppointmentUpdated,
    handleAppointmentDeleted,
    handleSyncedEventUpdated
  ]);

  /**
   * Connect to the WebSocket server
   */
  const connectWebSocket = useCallback(async () => {
    if (websocketManager.isConnected()) {
      return true;
    }
    
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Connecting to WebSocket server');
      const success = await websocketManager.initialize();
      
      if (success) {
        CalendarDebugUtils.log(COMPONENT_NAME, 'WebSocket connection initialized successfully');
      } else {
        CalendarDebugUtils.error(COMPONENT_NAME, 'Failed to initialize WebSocket connection');
        
        if (enableToasts) {
          showToast(
            'Connection Failed',
            'Could not establish real-time connection. Please try again later.',
            'destructive'
          );
        }
      }
      
      return success;
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error connecting to WebSocket server', error);
      
      if (enableToasts) {
        showToast(
          'Connection Error',
          'An error occurred while connecting to the real-time service.',
          'destructive'
        );
      }
      
      return false;
    }
  }, [enableToasts, showToast]);

  /**
   * Disconnect from the WebSocket server
   */
  const disconnectWebSocket = useCallback(() => {
    if (!websocketManager.isConnected()) {
      return;
    }
    
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Disconnecting from WebSocket server');
      websocketManager.disconnect();
      
      if (enableToasts) {
        showToast(
          'Disconnected',
          'Real-time calendar updates have been disabled.'
        );
      }
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error disconnecting from WebSocket server', error);
    }
  }, [enableToasts, showToast]);

  /**
   * Toggle WebSocket connection
   */
  const toggleConnection = useCallback(async () => {
    if (websocketManager.isConnected()) {
      disconnectWebSocket();
      return false;
    } else {
      return await connectWebSocket();
    }
  }, [connectWebSocket, disconnectWebSocket]);

  // Return hook API
  return {
    isConnected,
    connectionState,
    lastEvent,
    pendingUpdates,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    toggle: toggleConnection
  };
};

export default useRealTimeCalendar;