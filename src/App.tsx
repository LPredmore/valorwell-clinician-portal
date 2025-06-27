
import React from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Analytics from "./pages/Analytics";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import Reminders from "./pages/Reminders";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ClinicianDetails from "./pages/ClinicianDetails";
import MyClients from "./pages/MyClients";
import ClinicianDashboard from "./pages/ClinicianDashboard";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <UserProvider>
              {/* Sonner Toaster - the only toast component we need */}
              <Toaster richColors position="top-right" />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                
                {/* Allow clinicians and admins to view client details */}
                <Route path="/clients/:clientId" element={
                  <ProtectedRoute allowedRoles={['admin', 'moderator', 'clinician']}>
                    <ClientDetails />
                  </ProtectedRoute>
                } />
                
                {/* Protected routes - clinician, admin, moderator */}
                <Route path="/clinician-dashboard" element={
                  <ProtectedRoute allowedRoles={['admin', 'clinician']}>
                    <ClinicianDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/my-clients" element={
                  <ProtectedRoute allowedRoles={['admin', 'clinician']}>
                    <MyClients />
                  </ProtectedRoute>
                } />
                
                <Route path="/calendar" element={
                  <ProtectedRoute allowedRoles={['admin', 'clinician']}>
                    <Calendar />
                  </ProtectedRoute>
                } />
                
                {/* Clinicians can view their own profile */}
                <Route path="/clinicians/:clinicianId" element={
                  <ProtectedRoute allowedRoles={['admin', 'clinician']}>
                    <ClinicianDetails />
                  </ProtectedRoute>
                } />
                
                {/* Protected routes - admin only */}
                <Route path="/clients" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Clients />
                  </ProtectedRoute>
                } />
                
                <Route path="/analytics" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Analytics />
                  </ProtectedRoute>
                } />

                <Route path="/activity" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Activity />
                  </ProtectedRoute>
                } />

                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                } />

                <Route path="/reminders" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Reminders />
                  </ProtectedRoute>
                } />

                <Route path="/messages" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Messages />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </UserProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
