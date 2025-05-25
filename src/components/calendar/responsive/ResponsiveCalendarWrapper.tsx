import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'ResponsiveCalendarWrapper';

// Define breakpoints
export enum CalendarBreakpoint {
  MOBILE = 'mobile',    // < 640px
  TABLET = 'tablet',    // 640px - 1023px
  DESKTOP = 'desktop'   // >= 1024px
}

interface ResponsiveCalendarWrapperProps {
  children: React.ReactNode;
  mobileView?: React.ReactNode;
  tabletView?: React.ReactNode;
  desktopView?: React.ReactNode;
  onBreakpointChange?: (breakpoint: CalendarBreakpoint) => void;
  className?: string;
}

/**
 * ResponsiveCalendarWrapper component
 * Provides responsive layout for calendar components
 * Renders different views based on screen size
 */
const ResponsiveCalendarWrapper: React.FC<ResponsiveCalendarWrapperProps> = ({
  children,
  mobileView,
  tabletView,
  desktopView,
  onBreakpointChange,
  className = ''
}) => {
  // Use media queries to determine screen size
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  // State to track current breakpoint
  const [currentBreakpoint, setCurrentBreakpoint] = useState<CalendarBreakpoint>(
    isDesktop ? CalendarBreakpoint.DESKTOP :
    isTablet ? CalendarBreakpoint.TABLET :
    CalendarBreakpoint.MOBILE
  );
  
  // Update breakpoint when screen size changes
  useEffect(() => {
    let newBreakpoint: CalendarBreakpoint;
    
    if (isDesktop) {
      newBreakpoint = CalendarBreakpoint.DESKTOP;
    } else if (isTablet) {
      newBreakpoint = CalendarBreakpoint.TABLET;
    } else {
      newBreakpoint = CalendarBreakpoint.MOBILE;
    }
    
    if (newBreakpoint !== currentBreakpoint) {
      setCurrentBreakpoint(newBreakpoint);
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'Breakpoint changed', {
        previous: currentBreakpoint,
        current: newBreakpoint
      });
      
      if (onBreakpointChange) {
        onBreakpointChange(newBreakpoint);
      }
    }
  }, [isMobile, isTablet, isDesktop, currentBreakpoint, onBreakpointChange]);
  
  // Render the appropriate view based on breakpoint
  const renderContent = () => {
    switch (currentBreakpoint) {
      case CalendarBreakpoint.MOBILE:
        return mobileView || children;
      case CalendarBreakpoint.TABLET:
        return tabletView || children;
      case CalendarBreakpoint.DESKTOP:
        return desktopView || children;
      default:
        return children;
    }
  };
  
  return (
    <div 
      className={`responsive-calendar-wrapper ${className}`}
      data-breakpoint={currentBreakpoint}
    >
      {renderContent()}
    </div>
  );
};

export default ResponsiveCalendarWrapper;