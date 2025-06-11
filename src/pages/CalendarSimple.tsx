
import React, { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import NylasCalendarView from "../components/calendar/NylasCalendarView";

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized } = useUser();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (authInitialized && userId) {
      setIsReady(true);
    }
  }, [authInitialized, userId]);

  if (!isReady) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading calendar...</p>
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

            <NylasCalendarView clinicianId={userId} />
          </div>
        </div>
      </CalendarErrorBoundary>
    </Layout>
  );
});

CalendarSimple.displayName = 'CalendarSimple';

export default CalendarSimple;
