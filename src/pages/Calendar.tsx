
import React, { useEffect, useMemo, useCallback } from "react";
import Layout from "../components/layout/Layout";
import CalendarView from "../components/calendar/CalendarView";
import { addWeeks, subWeeks } from "date-fns";
import { useCalendarState } from "../hooks/useCalendarState";
import CalendarHeader from "../components/calendar/CalendarHeader";
import CalendarViewControls from "../components/calendar/CalendarViewControls";
import { useUser } from "@/context/UserContext";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import { getClinicianTimeZone } from "../hooks/useClinicianData";

const CalendarPage = React.memo(() => {
  // Get the logged-in user's ID
  const { userId } = useUser();

  const {
    selectedClinicianId,
    currentDate,
    setCurrentDate,
    userTimeZone,
    isLoadingTimeZone,
  } = useCalendarState(userId);

  // Fetch clinician's current timezone
  const [clinicianTimeZone, setClinicianTimeZone] = React.useState<string | null>(null);
  const [isLoadingClinicianTimeZone, setIsLoadingClinicianTimeZone] = React.useState(true);

  const fetchClinicianTimeZone = useCallback(async () => {
    if (!selectedClinicianId) {
      setClinicianTimeZone(null);
      setIsLoadingClinicianTimeZone(false);
      return;
    }

    try {
      setIsLoadingClinicianTimeZone(true);
      const timezone = await getClinicianTimeZone(selectedClinicianId);
      const resolvedTimezone = Array.isArray(timezone) ? timezone[0] : timezone;
      setClinicianTimeZone(resolvedTimezone);
    } catch (error) {
      console.error('[CalendarPage] Error fetching clinician timezone:', error);
      setClinicianTimeZone(userTimeZone);
    } finally {
      setIsLoadingClinicianTimeZone(false);
    }
  }, [selectedClinicianId, userTimeZone]);

  useEffect(() => {
    fetchClinicianTimeZone();
  }, [fetchClinicianTimeZone]);

  const navigatePrevious = useCallback(() => {
    setCurrentDate(subWeeks(currentDate, 1));
  }, [currentDate, setCurrentDate]);

  const navigateNext = useCallback(() => {
    setCurrentDate(addWeeks(currentDate, 1));
  }, [currentDate, setCurrentDate]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  const isLoading = useMemo(() => {
    return isLoadingTimeZone || isLoadingClinicianTimeZone;
  }, [isLoadingTimeZone, isLoadingClinicianTimeZone]);

  if (isLoading) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading calendar settings...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <CalendarErrorBoundary>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex flex-col space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
            </div>

            <CalendarHeader
              currentDate={currentDate}
              userTimeZone={userTimeZone}
              isLoadingTimeZone={isLoadingTimeZone}
              onNavigatePrevious={navigatePrevious}
              onNavigateNext={navigateNext}
              onNavigateToday={navigateToday}
            />

            <CalendarView
              view="week"
              showAvailability={false}
              clinicianId={selectedClinicianId}
              currentDate={currentDate}
              userTimeZone={userTimeZone}
              clinicianTimeZone={clinicianTimeZone || userTimeZone}
              refreshTrigger={0}
              appointments={[]}
              isLoading={false}
              error={null}
            />
          </div>
        </div>
      </CalendarErrorBoundary>
    </Layout>
  );
});

CalendarPage.displayName = 'CalendarPage';

export default CalendarPage;
