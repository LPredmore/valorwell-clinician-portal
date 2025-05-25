import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useCalendarState } from '@/hooks/useCalendarState';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { useTimeZone } from './TimeZoneContext';

// Component name for logging
const COMPONENT_NAME = 'CalendarContext';

// Define the context interface
interface CalendarContextType {
  // View state
  view: 'week' | 'month';
  setView: (view: 'week' | 'month') => void;
  
  // Availability state
  showAvailability: boolean;
  setShowAvailability: (show: boolean) => void;
  
  // Clinician state
  selectedClinicianId: string | null;
  setSelectedClinicianId: (id: string | null) => void;
  clinicians: Array<{ id: string; clinician_professional_name: string }>;
  loadingClinicians: boolean;
  
  // Date state
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  
  // Client state
  clients: Array<{ id: string; displayName: string }>;
  loadingClients: boolean;
  
  // Refresh state
  appointmentRefreshTrigger: number;
  refreshAppointments: () => void;
  
  // Dialog state
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  
  // Error state
  lastError: Error | null;
  
  // Refresh functions
  refreshClinicians: () => Promise<void>;
  refreshClients: () => void;
  
  // Timezone
  userTimeZone: string;
}

// Create the context with a default value
const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// Provider component
interface CalendarProviderProps {
  children: ReactNode;
  initialClinicianId?: string | null;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ 
  children, 
  initialClinicianId = null
}) => {
  // Use the calendar state hook
  const calendarState = useCalendarState(initialClinicianId);
  
  // Get timezone from context
  const { userTimeZone } = useTimeZone();
  
  // Log context initialization
  useEffect(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Calendar context initialized', {
      clinicianId: calendarState.selectedClinicianId,
      view: calendarState.view,
      timeZone: userTimeZone
    });
  }, [calendarState.selectedClinicianId, calendarState.view, userTimeZone]);

  // Memoize the context value to prevent unnecessary recreations
  const value = useMemo<CalendarContextType>(() => ({
    // View state
    view: calendarState.view,
    setView: calendarState.setView,
    
    // Availability state
    showAvailability: calendarState.showAvailability,
    setShowAvailability: calendarState.setShowAvailability,
    
    // Clinician state
    selectedClinicianId: calendarState.selectedClinicianId,
    setSelectedClinicianId: calendarState.setSelectedClinicianId,
    clinicians: calendarState.clinicians,
    loadingClinicians: calendarState.loadingClinicians,
    
    // Date state
    currentDate: calendarState.currentDate,
    setCurrentDate: calendarState.setCurrentDate,
    
    // Client state
    clients: calendarState.clients,
    loadingClients: calendarState.loadingClients,
    
    // Refresh state
    appointmentRefreshTrigger: calendarState.appointmentRefreshTrigger,
    refreshAppointments: calendarState.setAppointmentRefreshTrigger,
    
    // Dialog state
    isDialogOpen: calendarState.isDialogOpen,
    setIsDialogOpen: calendarState.setIsDialogOpen,
    
    // Error state
    lastError: calendarState.lastError,
    
    // Refresh functions
    refreshClinicians: calendarState.refreshClinicians,
    refreshClients: calendarState.refreshClients,
    
    // Timezone
    userTimeZone
  }), [calendarState, userTimeZone]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

// Custom hook to use the calendar context
export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

// Export the context for direct usage if needed
export default CalendarContext;