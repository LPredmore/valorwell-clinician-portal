import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import { useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import CalendarContainer from "./components/calendar/CalendarContainer";
import PatientDashboard from "./pages/PatientDashboard";
import ClinicianDashboard from "./pages/ClinicianDashboard";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import ClinicianDetails from "./pages/ClinicianDetails";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import NylasOAuthCallback from "./pages/NylasOAuthCallback";
import MonitoringPage from "./pages/MonitoringPage";
import AppointmentCreate from "./pages/AppointmentCreate";
import BlockedTimeCreate from "./pages/BlockedTimeCreate";
import Training from "./pages/Training";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Route monitoring component for debugging
const RouteMonitor = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log('[RouteMonitor] Route change:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state
    });
  }, [location]);
  
  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {/* Add route monitoring in development */}
            {process.env.NODE_ENV === 'development' && <RouteMonitor />}
            
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/portal" element={<PatientDashboard />} />
              <Route path="/nylas-oauth-callback" element={<NylasOAuthCallback />} />
              
              {/* Add API callback route for Nylas OAuth */}
              <Route path="/api/nylas/callback" element={<NylasOAuthCallback />} />

              {/* Protected Routes */}
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <CalendarContainer />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/appointments/new" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <AppointmentCreate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/blocked-time/new" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <BlockedTimeCreate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <ClinicianDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/clients" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <Clients />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/clients/:id" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <ClientDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/clinicians/:clinicianId" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <ClinicianDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/monitoring" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <MonitoringPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/training" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <Training />
                  </ProtectedRoute>
                } 
              />

              {/* Root route redirect based on authentication */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;
