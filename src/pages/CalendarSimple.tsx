import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import WeeklyCalendarGrid from "../components/calendar/WeeklyCalendarGrid";
import AvailabilityManagementSidebar from "../components/calendar/AvailabilityManagementSidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addWeeks, subWeeks } from "date-fns";
import { TimeZoneService } from "@/utils/timeZoneService";
import { getClinicianTimeZone } from "@/hooks/useClinicianData";

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized, userRole } = useUser();
  const [isReady, setIsReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('[CalendarSimple] Auth state:', { authInitialized, userId, userRole });
    
    if (authInitialized) {
      if (!userId) {
        console.log('[CalendarSimple] No user found, redirecting to login');
        toast({
          title: "Authentication Required",
          description: "Please log in to access the calendar",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }
      
      if (userRole === 'client') {
        console.log('[CalendarSimple] Client user detected, redirecting to portal');
        toast({
          title: "Access Denied",
          description: "This calendar is for clinicians only. Redirecting to client portal.",
          variant: "destructive"
        });
        navigate('/portal');
        return;
      }
      
      if (userRole === 'clinician' || userRole === 'admin') {
        console.log('[CalendarSimple] Authorized user, setting ready');
        setIsReady(true);
      }
    }
  }, [authInitialized, userId, userRole, navigate, toast]);

  // Load user's timezone
  useEffect(() => {
    const loadUserTimeZone = async () => {
      if (userId) {
        try {
          const timeZone = await getClinicianTimeZone(userId);
          setUserTimeZone(TimeZoneService.ensureIANATimeZone(timeZone));
        } catch (error) {
          console.error('Error loading user timezone:', error);
          // Keep default timezone
        }
      }
    };

    if (isReady && userId) {
      loadUserTimeZone();
    }
  }, [isReady, userId]);

  const navigatePrevious = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const navigateNext = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  if (!authInitialized) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Initializing authentication...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!userId) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <p className="text-lg font-medium">Authentication Required</p>
                <p className="text-sm">Please log in to access the calendar</p>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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
        <div className="space-y-6">
          {/* Header with navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={navigateToday}>
                Today
              </Button>
              <Button variant="outline" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h1>
            <div className="text-sm text-gray-500">
              User: {userRole} | Timezone: {userTimeZone}
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar display */}
            <div className="lg:col-span-3">
              <WeeklyCalendarGrid
                currentDate={currentDate}
                clinicianId={userId}
                userTimeZone={userTimeZone}
                onAvailabilityClick={(date, startTime, endTime) => {
                  console.log('Availability clicked:', { date, startTime, endTime });
                  // TODO: Implement availability editing modal
                }}
              />
            </div>

            {/* Availability management sidebar */}
            <div className="lg:col-span-1">
              <AvailabilityManagementSidebar
                clinicianId={userId}
                userTimeZone={userTimeZone}
              />
            </div>
          </div>
        </div>
      </CalendarErrorBoundary>
    </Layout>
  );
});

CalendarSimple.displayName = 'CalendarSimple';

export default CalendarSimple;
