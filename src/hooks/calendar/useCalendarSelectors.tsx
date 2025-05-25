import { useCallback } from 'react';
import { useCalendar } from '@/context/CalendarContext';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'useCalendarSelectors';

/**
 * Hook for creating optimized selectors for the CalendarContext
 * Prevents unnecessary re-renders by only subscribing to specific parts of the context
 */
export const useCalendarSelectors = () => {
  // Get the full calendar context
  const calendarContext = useCalendar();
  
  // Create selectors for different parts of the context
  
  // View selector
  const useViewSelector = useCallback(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Using view selector');
    
    return {
      view: calendarContext.view,
      setView: calendarContext.setView
    };
  }, [calendarContext.view, calendarContext.setView]);
  
  // Availability selector
  const useAvailabilitySelector = useCallback(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Using availability selector');
    
    return {
      showAvailability: calendarContext.showAvailability,
      setShowAvailability: calendarContext.setShowAvailability
    };
  }, [calendarContext.showAvailability, calendarContext.setShowAvailability]);
  
  // Clinician selector
  const useClinicianSelector = useCallback(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Using clinician selector');
    
    return {
      selectedClinicianId: calendarContext.selectedClinicianId,
      setSelectedClinicianId: calendarContext.setSelectedClinicianId,
      clinicians: calendarContext.clinicians,
      loadingClinicians: calendarContext.loadingClinicians,
      refreshClinicians: calendarContext.refreshClinicians
    };
  }, [
    calendarContext.selectedClinicianId,
    calendarContext.setSelectedClinicianId,
    calendarContext.clinicians,
    calendarContext.loadingClinicians,
    calendarContext.refreshClinicians
  ]);
  
  // Date selector
  const useDateSelector = useCallback(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Using date selector');
    
    return {
      currentDate: calendarContext.currentDate,
      setCurrentDate: calendarContext.setCurrentDate,
      userTimeZone: calendarContext.userTimeZone
    };
  }, [
    calendarContext.currentDate,
    calendarContext.setCurrentDate,
    calendarContext.userTimeZone
  ]);
  
  // Client selector
  const useClientSelector = useCallback(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Using client selector');
    
    return {
      clients: calendarContext.clients,
      loadingClients: calendarContext.loadingClients,
      refreshClients: calendarContext.refreshClients
    };
  }, [
    calendarContext.clients,
    calendarContext.loadingClients,
    calendarContext.refreshClients
  ]);
  
  // Appointment selector
  const useAppointmentSelector = useCallback(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Using appointment selector');
    
    return {
      appointmentRefreshTrigger: calendarContext.appointmentRefreshTrigger,
      refreshAppointments: calendarContext.refreshAppointments
    };
  }, [
    calendarContext.appointmentRefreshTrigger,
    calendarContext.refreshAppointments
  ]);
  
  // Dialog selector
  const useDialogSelector = useCallback(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Using dialog selector');
    
    return {
      isDialogOpen: calendarContext.isDialogOpen,
      setIsDialogOpen: calendarContext.setIsDialogOpen
    };
  }, [
    calendarContext.isDialogOpen,
    calendarContext.setIsDialogOpen
  ]);
  
  // Error selector
  const useErrorSelector = useCallback(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Using error selector');
    
    return {
      lastError: calendarContext.lastError
    };
  }, [calendarContext.lastError]);

  return {
    useViewSelector,
    useAvailabilitySelector,
    useClinicianSelector,
    useDateSelector,
    useClientSelector,
    useAppointmentSelector,
    useDialogSelector,
    useErrorSelector
  };
};

export default useCalendarSelectors;