/**
 * CSS Optimization Utilities
 * Provides functions to optimize CSS rendering performance
 */

/**
 * Determines if an element should use hardware acceleration
 * based on its animation properties
 */
export const shouldUseHardwareAcceleration = (
  hasTransform: boolean,
  hasOpacity: boolean,
  hasPosition: boolean
): boolean => {
  // Elements with transforms or opacity changes benefit most from hardware acceleration
  return hasTransform || (hasOpacity && hasPosition);
};

/**
 * Generates optimized CSS transform properties
 * Uses will-change and transform3d for hardware acceleration
 */
export const getOptimizedTransform = (
  x: number = 0,
  y: number = 0,
  scale: number = 1,
  useHardwareAcceleration: boolean = true
): string => {
  const transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  
  if (useHardwareAcceleration) {
    return `
      transform: ${transform};
      will-change: transform;
    `;
  }
  
  return `transform: ${transform};`;
};

/**
 * Generates CSS class names for optimized rendering
 * Helps prevent unnecessary re-renders by using consistent class names
 */
export const getOptimizedClassNames = (
  baseClass: string,
  conditionalClasses: Record<string, boolean>
): string => {
  const classes = [baseClass];
  
  Object.entries(conditionalClasses).forEach(([className, condition]) => {
    if (condition) {
      classes.push(className);
    }
  });
  
  return classes.join(' ');
};

/**
 * Optimizes CSS animations by using transform and opacity
 * instead of properties that trigger layout recalculations
 */
export const getOptimizedAnimation = (
  property: 'fade' | 'slide' | 'scale',
  duration: number = 300
): string => {
  switch (property) {
    case 'fade':
      return `
        transition: opacity ${duration}ms ease-in-out;
        will-change: opacity;
      `;
    case 'slide':
      return `
        transition: transform ${duration}ms ease-in-out;
        will-change: transform;
      `;
    case 'scale':
      return `
        transition: transform ${duration}ms ease-in-out;
        will-change: transform;
      `;
    default:
      return '';
  }
};

/**
 * Creates a debounced resize handler for responsive components
 * to prevent excessive style recalculations
 */
export const createDebouncedResizeHandler = (
  callback: () => void,
  delay: number = 100
): () => void => {
  let timeoutId: number | null = null;
  
  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      callback();
      timeoutId = null;
    }, delay);
  };
};

/**
 * Optimizes rendering for lists by generating stable keys
 * to help React's reconciliation algorithm
 */
export const getStableKey = (
  prefix: string,
  id: string | number,
  index: number
): string => {
  return `${prefix}-${id}-${index}`;
};

/**
 * Determines if an element is in the viewport
 * Used for implementing efficient lazy loading
 */
export const isInViewport = (
  element: HTMLElement,
  offset: number = 0
): boolean => {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top - offset <= window.innerHeight &&
    rect.bottom + offset >= 0 &&
    rect.left - offset <= window.innerWidth &&
    rect.right + offset >= 0
  );
};

/**
 * Creates an intersection observer for lazy loading
 */
export const createLazyLoadObserver = (
  callback: (entry: IntersectionObserverEntry) => void,
  rootMargin: string = '100px'
): IntersectionObserver => {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry);
        }
      });
    },
    { rootMargin }
  );
};