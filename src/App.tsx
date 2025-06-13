
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
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

const queryClient = new QueryClient();

const App = () => {
  return (
    <ErrorBoundary componentName="Application">
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
                
                {/* Nylas OAuth Callback Routes - Support both paths for flexibility */}
                <Route path="/nylas-oauth-callback" element={<NylasOAuthCallback />} />
                <Route path="/nylas-callback" element={<NylasOAuthCallback />} />

                {/* Protected Routes */}
                <Route
                  path="/calendar"
                  element={
                    <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                      <ErrorBoundary componentName="Calendar">
                        <Calendar />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                      <ErrorBoundary componentName="Dashboard">
                        <PatientDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clients"
                  element={
                    <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                      <ErrorBoundary componentName="Clients">
                        <Clients />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clients/:id"
                  element={
                    <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                      <ErrorBoundary componentName="ClientDetails">
                        <ClientDetails />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ErrorBoundary componentName="Settings">
                        <Settings />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect - Use Index component to handle auth-aware routing */}
                <Route path="/" element={
                  <ErrorBoundary componentName="Index">
                    <Index />
                  </ErrorBoundary>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
