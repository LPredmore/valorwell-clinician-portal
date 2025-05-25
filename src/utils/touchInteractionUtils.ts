import React, { useEffect } from 'react';
import { CalendarDebugUtils } from './calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'TouchInteractionUtils';

/**
 * Swipe Direction Enum
 * Defines the possible directions for swipe gestures
 */
export enum SwipeDirection {
  LEFT = 'left',
  RIGHT = 'right',
  UP = 'up',
  DOWN = 'down'
}

/**
 * Swipe Event Interface
 * Defines the structure of a swipe event
 */
export interface SwipeEvent {
  direction: SwipeDirection;
  distance: number;
  velocity: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
}

/**
 * Swipe Options Interface
 * Defines the options for swipe detection
 */
export interface SwipeOptions {
  minDistance?: number;
  maxDuration?: number;
  minVelocity?: number;
  preventDefaultOnSwipe?: boolean;
  preventScrollOnSwipe?: boolean;
  onSwipeStart?: (event: TouchEvent) => void;
  onSwipeMove?: (event: TouchEvent, delta: { x: number; y: number }) => void;
  onSwipeEnd?: (event: TouchEvent, swipe: SwipeEvent | null) => void;
  onSwipe?: (event: TouchEvent, swipe: SwipeEvent) => void;
  onSwipeLeft?: (event: TouchEvent, swipe: SwipeEvent) => void;
  onSwipeRight?: (event: TouchEvent, swipe: SwipeEvent) => void;
  onSwipeUp?: (event: TouchEvent, swipe: SwipeEvent) => void;
  onSwipeDown?: (event: TouchEvent, swipe: SwipeEvent) => void;
}

/**
 * Default swipe options
 */
const DEFAULT_SWIPE_OPTIONS: SwipeOptions = {
  minDistance: 50,
  maxDuration: 1000,
  minVelocity: 0.1,
  preventDefaultOnSwipe: true,
  preventScrollOnSwipe: true
};

/**
 * Swipe state interface
 * Defines the state for tracking swipe gestures
 */
interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  isTracking: boolean;
}

/**
 * Add swipe detection to an element
 * @param element The element to add swipe detection to
 * @param options The swipe options
 * @returns A function to remove the swipe detection
 */
export function addSwipeDetection(
  element: HTMLElement,
  options: SwipeOptions = {}
): () => void {
  // Merge options with defaults
  const mergedOptions: SwipeOptions = { ...DEFAULT_SWIPE_OPTIONS, ...options };
  
  // Initialize swipe state
  const state: SwipeState = {
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    isTracking: false
  };
  
  // Touch start handler
  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.startTime = Date.now();
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;
    state.isTracking = true;
    
    if (mergedOptions.onSwipeStart) {
      mergedOptions.onSwipeStart(event);
    }
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'Touch start', {
      x: state.startX,
      y: state.startY,
      time: state.startTime
    });
  };
  
  // Touch move handler
  const handleTouchMove = (event: TouchEvent) => {
    if (!state.isTracking || event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;
    
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    
    if (mergedOptions.onSwipeMove) {
      mergedOptions.onSwipeMove(event, { x: deltaX, y: deltaY });
    }
    
    // Prevent scrolling if needed
    if (mergedOptions.preventScrollOnSwipe) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // If horizontal swipe is more significant than vertical, prevent default
      if (absX > absY && absX > 10) {
        event.preventDefault();
      }
    }
  };
  
  // Touch end handler
  const handleTouchEnd = (event: TouchEvent) => {
    if (!state.isTracking) return;
    
    const endTime = Date.now();
    const duration = endTime - state.startTime;
    
    // Calculate swipe metrics
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;
    
    // Determine if this is a valid swipe
    const isValidSwipe = 
      distance >= (mergedOptions.minDistance || 0) &&
      duration <= (mergedOptions.maxDuration || Infinity) &&
      velocity >= (mergedOptions.minVelocity || 0);
    
    if (isValidSwipe) {
      // Determine swipe direction
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      let direction: SwipeDirection;
      
      if (absX > absY) {
        direction = deltaX > 0 ? SwipeDirection.RIGHT : SwipeDirection.LEFT;
      } else {
        direction = deltaY > 0 ? SwipeDirection.DOWN : SwipeDirection.UP;
      }
      
      // Create swipe event
      const swipe: SwipeEvent = {
        direction,
        distance,
        velocity,
        startX: state.startX,
        startY: state.startY,
        endX: state.currentX,
        endY: state.currentY,
        duration
      };
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'Swipe detected', {
        direction,
        distance,
        velocity,
        duration
      });
      
      // Call the appropriate callbacks
      if (mergedOptions.preventDefaultOnSwipe) {
        event.preventDefault();
      }
      
      if (mergedOptions.onSwipe) {
        mergedOptions.onSwipe(event, swipe);
      }
      
      switch (direction) {
        case SwipeDirection.LEFT:
          if (mergedOptions.onSwipeLeft) {
            mergedOptions.onSwipeLeft(event, swipe);
          }
          break;
        case SwipeDirection.RIGHT:
          if (mergedOptions.onSwipeRight) {
            mergedOptions.onSwipeRight(event, swipe);
          }
          break;
        case SwipeDirection.UP:
          if (mergedOptions.onSwipeUp) {
            mergedOptions.onSwipeUp(event, swipe);
          }
          break;
        case SwipeDirection.DOWN:
          if (mergedOptions.onSwipeDown) {
            mergedOptions.onSwipeDown(event, swipe);
          }
          break;
      }
    }
    
    if (mergedOptions.onSwipeEnd) {
      mergedOptions.onSwipeEnd(event, isValidSwipe ? {
        direction: Math.abs(deltaX) > Math.abs(deltaY)
          ? (deltaX > 0 ? SwipeDirection.RIGHT : SwipeDirection.LEFT)
          : (deltaY > 0 ? SwipeDirection.DOWN : SwipeDirection.UP),
        distance,
        velocity,
        startX: state.startX,
        startY: state.startY,
        endX: state.currentX,
        endY: state.currentY,
        duration
      } : null);
    }
    
    // Reset tracking state
    state.isTracking = false;
  };
  
  // Touch cancel handler
  const handleTouchCancel = (event: TouchEvent) => {
    if (!state.isTracking) return;
    
    if (mergedOptions.onSwipeEnd) {
      mergedOptions.onSwipeEnd(event, null);
    }
    
    // Reset tracking state
    state.isTracking = false;
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'Touch cancelled');
  };
  
  // Add event listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd, { passive: false });
  element.addEventListener('touchcancel', handleTouchCancel, { passive: false });
  
  // Return a function to remove the event listeners
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchCancel);
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'Swipe detection removed');
  };
}

/**
 * React hook for using swipe detection in React components
 * @param ref The ref to the element to add swipe detection to
 * @param options The swipe options
 */
export function useSwipeDetection(
  ref: React.RefObject<HTMLElement>,
  options: SwipeOptions = {}
): void {
  useEffect(() => {
    if (!ref.current) return;
    
    const removeSwipeDetection = addSwipeDetection(ref.current, options);
    
    return removeSwipeDetection;
  }, [ref, options]);
}

export default {
  SwipeDirection,
  addSwipeDetection,
  useSwipeDetection
};