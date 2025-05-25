import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { createLazyLoadObserver } from '@/utils/cssOptimizer';

interface LazyLoadProps {
  children: ReactNode;
  placeholder?: ReactNode;
  height?: number | string;
  width?: number | string;
  rootMargin?: string;
  className?: string;
  onVisible?: () => void;
  threshold?: number;
}

/**
 * LazyLoad component for optimizing rendering performance
 * Only renders children when they become visible in the viewport
 */
const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  placeholder,
  height = 'auto',
  width = 'auto',
  rootMargin = '100px',
  className = '',
  onVisible,
  threshold = 0.1
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;
    
    // Create an observer instance
    const observer = createLazyLoadObserver((entry) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        if (onVisible) onVisible();
        observer.unobserve(entry.target);
      }
    }, rootMargin);
    
    // Start observing the target element
    observer.observe(currentRef);
    
    // Clean up the observer when component unmounts
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [rootMargin, onVisible]);
  
  // Default placeholder showing dimensions
  const defaultPlaceholder = (
    <div 
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
        background: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="animate-pulse bg-gray-200 rounded-md w-3/4 h-3/4"></div>
    </div>
  );
  
  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
        overflow: 'hidden'
      }}
    >
      {isVisible ? children : (placeholder || defaultPlaceholder)}
    </div>
  );
};

export default LazyLoad;