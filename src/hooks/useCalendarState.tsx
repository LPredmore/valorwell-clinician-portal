import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTimeZone } from '@/context/TimeZoneContext';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { useClinicianFetcher } from './calendar/useClinicianFetcher';
import { useClientFetcher } from './calendar/useClientFetcher';

/**
 * Enhanced calendar state management hook with better separation of concerns
 * Refactored to use specialized hooks for data fetching
 */
export const useCalendarState = (initialClinicianId: string | null = null) => {
  // Performance tracking
  const hookStartTime = performance.now();
  
  // State variables
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedClinicianId, setSelectedClinicianId] = useState<string | null>(initialClinicianId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointmentRefreshTrigger, setAppointmentRefreshTrigger] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Get timezone from context
  const { userTimeZone } = useTimeZone();

  // Memoize the formatted clinician ID to prevent unnecessary recalculations
  const formattedClinicianId = useMemo(() => {
    if (!selectedClinicianId) return null;
    return selectedClinicianId.toString().trim();
  }, [selectedClinicianId]);
  
  // Log important state information
  useEffect(() => {
    const stateInfo = {
      view,
      clinicianId: formattedClinicianId,
      originalClinicianId: selectedClinicianId,
      timeZone: userTimeZone,
      refreshTrigger: appointmentRefreshTrigger
    };
    
    CalendarDebugUtils.log('useCalendarState', 'Current state updated', stateInfo);
  }, [view, selectedClinicianId, formattedClinicianId, userTimeZone, appointmentRefreshTrigger]);

  // Use specialized hook for clinician fetching
  const {
    clinicians,
    loadingClinicians,
    refreshClinicians
  } = useClinicianFetcher(initialClinicianId, selectedClinicianId, setSelectedClinicianId, setLastError);

  // Use specialized hook for client fetching
  const {
    clients,
    loadingClients,
    refreshClients
  } = useClientFetcher(formattedClinicianId, setLastError);

  // Memoized trigger for appointment refresh to prevent unnecessary renders
  const triggerAppointmentRefresh = useCallback(() => {
    setAppointmentRefreshTrigger(prev => prev + 1);
  }, []);

  // Log hook performance
  useEffect(() => {
    const hookDuration = performance.now() - hookStartTime;
    CalendarDebugUtils.logPerformance('useCalendarState', 'hook-initialization', hookDuration);
  }, []);

  // Memoize the return value to prevent unnecessary object creation
  return useMemo(() => ({
    view,
    setView,
    showAvailability,
    setShowAvailability,
    selectedClinicianId,
    setSelectedClinicianId,
    clinicians,
    loadingClinicians,
    currentDate,
    setCurrentDate,
    clients,
    loadingClients,
    appointmentRefreshTrigger,
    setAppointmentRefreshTrigger: triggerAppointmentRefresh,
    isDialogOpen,
    setIsDialogOpen,
    lastError,
    refreshClinicians,
    refreshClients
  }), [
    view, showAvailability, selectedClinicianId, clinicians, loadingClinicians,
    currentDate, clients, loadingClients, appointmentRefreshTrigger,
    isDialogOpen, lastError, refreshClinicians, refreshClients, triggerAppointmentRefresh
  ]);
};

export default useCalendarState;
