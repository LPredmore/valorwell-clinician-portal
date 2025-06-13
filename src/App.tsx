import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthProvider";
import AuthWrapper from "@/components/auth/AuthWrapper";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Pages
import Login from "./pages/Login";
import Calendar from "./pages/Calendar";
import PatientDashboard from "./pages/PatientDashboard";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import NylasOAuthCallback from "./pages/NylasOAuthCallback";
import Index from "./pages/Index";

const queryClient = new QueryClient();

/**
 * Main App component with simplified error handling
 * Uses a single error boundary at the application level
 * and AuthProvider for centralized authentication
 */
const App = () => {
  return (
    <ErrorBoundary componentName="Application">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/portal" element={<PatientDashboard />} />
                
                {/* Nylas OAuth Callback Routes */}
                <Route path="/nylas-oauth-callback" element={<NylasOAuthCallback />} />
                <Route path="/nylas-callback" element={<NylasOAuthCallback />} />

                {/* Protected Routes with simplified auth handling */}
                <Route
                  path="/calendar"
                  element={
                    <AuthWrapper allowedRoles={['clinician', 'admin']}>
                      <Calendar />
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <AuthWrapper allowedRoles={['clinician', 'admin']}>
                      <PatientDashboard />
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/clients"
                  element={
                    <AuthWrapper allowedRoles={['clinician', 'admin']}>
                      <Clients />
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/clients/:id"
                  element={
                    <AuthWrapper allowedRoles={['clinician', 'admin']}>
                      <ClientDetails />
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <AuthWrapper allowedRoles={['admin']}>
                      <Settings />
                    </AuthWrapper>
                  }
                />

                {/* Default redirect - Use Index component to handle auth-aware routing */}
                <Route path="/" element={<Index />} />
                
                {/* Fallback route for any unmatched routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
