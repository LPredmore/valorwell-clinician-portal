
import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AuthErrorBoundary from "./components/auth/AuthErrorBoundary";

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

/**
 * Main App component with enhanced error handling for authentication
 * Uses specialized error boundaries for different parts of the application
 */
const App = () => {
  // Track if auth has been initialized to prevent unnecessary error states
  const [authTimeoutOccurred, setAuthTimeoutOccurred] = useState(false);
  
  // Set a global timeout to detect potential auth initialization issues
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.warn('[App] Auth initialization timeout occurred');
      setAuthTimeoutOccurred(true);
    }, 20000); // 20 seconds should be enough for auth to initialize
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  return (
    <ErrorBoundary componentName="Application">
      <QueryClientProvider client={queryClient}>
        {/* Wrap UserProvider in AuthErrorBoundary to catch auth-specific errors */}
        <AuthErrorBoundary componentName="Authentication">
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

                  {/* Protected Routes with enhanced error handling */}
                  <Route
                    path="/calendar"
                    element={
                      <AuthErrorBoundary componentName="Calendar Authentication">
                        <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                          <ErrorBoundary componentName="Calendar">
                            <Calendar />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      </AuthErrorBoundary>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <AuthErrorBoundary componentName="Dashboard Authentication">
                        <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                          <ErrorBoundary componentName="Dashboard">
                            <PatientDashboard />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      </AuthErrorBoundary>
                    }
                  />
                  <Route
                    path="/clients"
                    element={
                      <AuthErrorBoundary componentName="Clients Authentication">
                        <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                          <ErrorBoundary componentName="Clients">
                            <Clients />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      </AuthErrorBoundary>
                    }
                  />
                  <Route
                    path="/clients/:id"
                    element={
                      <AuthErrorBoundary componentName="ClientDetails Authentication">
                        <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                          <ErrorBoundary componentName="ClientDetails">
                            <ClientDetails />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      </AuthErrorBoundary>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <AuthErrorBoundary componentName="Settings Authentication">
                        <ProtectedRoute allowedRoles={['admin']}>
                          <ErrorBoundary componentName="Settings">
                            <Settings />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      </AuthErrorBoundary>
                    }
                  />

                  {/* Default redirect - Use Index component to handle auth-aware routing */}
                  <Route path="/" element={
                    <AuthErrorBoundary componentName="Index Authentication">
                      <ErrorBoundary componentName="Index">
                        <Index />
                      </ErrorBoundary>
                    </AuthErrorBoundary>
                  } />
                  
                  {/* Fallback route for any unmatched routes */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </UserProvider>
        </AuthErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
