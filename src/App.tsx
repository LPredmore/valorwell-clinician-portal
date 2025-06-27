
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Calendar from "./pages/Calendar";
import PatientDashboard from "./pages/PatientDashboard";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import ClinicianDetails from "./pages/ClinicianDetails";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import NylasOAuthCallback from "./pages/NylasOAuthCallback";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/portal" element={<PatientDashboard />} />
              <Route path="/nylas-oauth-callback" element={<NylasOAuthCallback />} />

              {/* Protected Routes */}
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <Calendar />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <PatientDashboard />
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

              {/* Root route redirect based on authentication */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <Navigate to="/calendar" replace />
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
