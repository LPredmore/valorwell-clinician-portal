/**
 * RealTimeCalendarIndicator Component
 * 
 * This component provides visual indicators for real-time calendar updates.
 * It shows connection status, recent updates, and provides controls for
 * enabling/disabling real-time updates.
 */

import React, { useState, useEffect } from 'react';
import { useRealTimeCalendar } from '@/hooks/useRealTimeCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WebSocketEventType } from '@/utils/websocketManager';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'RealTimeCalendarIndicator';

// Props interface
interface RealTimeCalendarIndicatorProps {
  onAppointmentUpdate?: () => void;
  compact?: boolean;
  className?: string;
  showControls?: boolean;
}

/**
 * Component for displaying real-time calendar update indicators
 */
export const RealTimeCalendarIndicator: React.FC<RealTimeCalendarIndicatorProps> = ({
  onAppointmentUpdate,
  compact = false,
  className = '',
  showControls = true
}) => {
  // State for animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastUpdateType, setLastUpdateType] = useState<string | null>(null);
  
  // Initialize real-time calendar hook
  const {
    isConnected,
    connectionState,
    lastEvent,
    pendingUpdates,
    connect,
    disconnect,
    toggle
  } = useRealTimeCalendar({
    onAppointmentCreated: () => {
      triggerAnimation(WebSocketEventType.APPOINTMENT_CREATED);
      if (onAppointmentUpdate) onAppointmentUpdate();
    },
    onAppointmentUpdated: () => {
      triggerAnimation(WebSocketEventType.APPOINTMENT_UPDATED);
      if (onAppointmentUpdate) onAppointmentUpdate();
    },
    onAppointmentDeleted: () => {
      triggerAnimation(WebSocketEventType.APPOINTMENT_DELETED);
      if (onAppointmentUpdate) onAppointmentUpdate();
    },
    onSyncedEventUpdated: () => {
      triggerAnimation(WebSocketEventType.SYNCED_EVENT_UPDATED);
      if (onAppointmentUpdate) onAppointmentUpdate();
    }
  });

  // Trigger animation when updates occur
  const triggerAnimation = (type: string) => {
    setLastUpdateType(type);
    setIsAnimating(true);
    
    // Log the update
    CalendarDebugUtils.log(COMPONENT_NAME, 'Real-time update received', { type });
  };

  // Reset animation after it completes
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 2000); // Animation duration
      
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  // Get status color based on connection state
  const getStatusColor = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return 'bg-green-500';
      case 'CONNECTING':
        return 'bg-yellow-500';
      case 'ERROR':
        return 'bg-red-500';
      case 'DISCONNECTED':
      default:
        return 'bg-gray-500';
    }
  };

  // Get animation class based on update type
  const getAnimationClass = () => {
    if (!isAnimating) return '';
    
    switch (lastUpdateType) {
      case WebSocketEventType.APPOINTMENT_CREATED:
        return 'animate-pulse-green';
      case WebSocketEventType.APPOINTMENT_UPDATED:
        return 'animate-pulse-blue';
      case WebSocketEventType.APPOINTMENT_DELETED:
        return 'animate-pulse-red';
      case WebSocketEventType.SYNCED_EVENT_UPDATED:
        return 'animate-pulse-purple';
      default:
        return 'animate-pulse';
    }
  };

  // Format the last update time
  const formatLastUpdateTime = () => {
    if (!lastEvent) return 'Never';
    
    try {
      const date = new Date(lastEvent.timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return 'Unknown';
    }
  };

  // Render compact version
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center space-x-1 ${className}`}>
              <div className={`h-2 w-2 rounded-full ${getStatusColor()} ${getAnimationClass()}`} />
              {pendingUpdates > 0 && (
                <Badge variant="outline" className="h-4 min-w-4 px-1 text-[10px]">
                  {pendingUpdates}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p>Real-time updates: <span className="font-semibold">{isConnected ? 'Active' : 'Inactive'}</span></p>
              <p>Status: <span className="font-semibold">{connectionState}</span></p>
              <p>Last update: <span className="font-semibold">{formatLastUpdateTime()}</span></p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Render full version
  return (
    <div className={`flex items-center space-x-2 rounded-md border p-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`h-3 w-3 rounded-full ${getStatusColor()} ${getAnimationClass()}`} />
        <span className="text-sm font-medium">
          {isConnected ? 'Real-time updates active' : 'Real-time updates inactive'}
        </span>
      </div>
      
      {lastEvent && (
        <span className="text-xs text-muted-foreground">
          Last update: {formatLastUpdateTime()}
        </span>
      )}
      
      {pendingUpdates > 0 && (
        <Badge variant="outline">
          {pendingUpdates} pending
        </Badge>
      )}
      
      {showControls && (
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          className="ml-auto h-7 text-xs"
        >
          {isConnected ? 'Disable' : 'Enable'} real-time
        </Button>
      )}
    </div>
  );
};

export default RealTimeCalendarIndicator;