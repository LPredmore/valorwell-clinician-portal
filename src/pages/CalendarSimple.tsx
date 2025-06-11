
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import NylasCalendarView from "../components/calendar/NylasCalendarView";

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized, userRole } = useUser();
  const [isReady, setIsReady] = useState(false);
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
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex flex-col space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
              <div className="text-sm text-gray-500">
                User: {userRole} | ID: {userId?.slice(0, 8)}...
              </div>
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
