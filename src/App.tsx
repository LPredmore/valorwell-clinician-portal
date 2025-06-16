import React, { lazy, Suspense, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthProvider";
import ErrorBoundary, { ErrorCategory } from "./components/common/ErrorBoundary";
import { isConfigValid, getConfigErrors } from "@/utils/configValidation";

// Lazy-loaded components with error boundaries
const LazyIndex = lazy(() => import("./pages/Index"));
const LazyCalendar = lazy(() => import("./pages/Calendar"));
const LazyLogin = lazy(() => import("./pages/Login"));
const LazyResetPassword = lazy(() => import("./pages/ResetPassword"));
const LazyUpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const LazyNotFound = lazy(() => import("./pages/NotFound"));
const LazyNylasCallback = lazy(() => import("./pages/NylasCallback"));
const LazyNylasOAuthCallback = lazy(() => import("./pages/NylasOAuthCallback"));

// Component to display when environment variables are missing
const ConfigurationErrorComponent = ({ errors }: { errors: Record<string, string> }) => (
  <div style={{ padding: '20px', color: 'red', fontSize: '18px' }}>
    <h1>Configuration Error</h1>
    <p>Missing or invalid environment variables:</p>
    <ul>
      {Object.entries(errors).map(([key, message]) => (
        <li key={key}>
          <strong>{key}:</strong> {message}
        </li>
      ))}
    </ul>
    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff8e8', borderRadius: '4px' }}>
      <p><strong>Troubleshooting:</strong></p>
      <ol>
        <li>Check your .env file to ensure all required variables are set</li>
        <li>Restart the development server after updating environment variables</li>
        <li>Contact the development team if the issue persists</li>
      </ol>
    </div>
  </div>
);

// Loading component for suspense fallback
const LoadingComponent = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    flexDirection: 'column',
    gap: '1rem'
  }}>
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    <p className="text-lg">Loading application...</p>
  </div>
);

// Error component for chunk loading failures
const ChunkErrorComponent = ({ onRetry }: { onRetry: () => void }) => (
  <div style={{ padding: '20px', color: 'red', fontSize: '18px', textAlign: 'center' }}>
    <h2>Failed to load application module</h2>
    <p>This could be due to network issues or a new deployment.</p>
    <button
      onClick={onRetry}
      style={{
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: '#4a90e2',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Retry
    </button>
  </div>
);

/**
 * Main App component with progressive initialization
 * Implements proper error handling and optimized dynamic imports
 */
const App = () => {
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Validate environment configuration
        if (!isConfigValid()) {
          setConfigErrors(getConfigErrors());
          throw new Error("Invalid configuration");
        }

        // Additional initialization steps can be added here
        // For example: feature flag initialization, analytics setup, etc.

        // Mark initialization as complete
        setIsInitialized(true);
      } catch (error) {
        console.error("Application initialization failed:", error);
        setInitializationError(error instanceof Error ? error.message : "Unknown initialization error");
      }
    };

    initializeApp();
  }, [retryCount]);

  // Handle retry of initialization
  const handleRetry = () => {
    setInitializationError(null);
    setConfigErrors({});
    setRetryCount(prev => prev + 1);
  };

  // Show configuration error if environment variables are missing
  if (Object.keys(configErrors).length > 0) {
    return <ConfigurationErrorComponent errors={configErrors} />;
  }

  // Show initialization error if any
  if (initializationError) {
    return (
      <div style={{ padding: '20px', color: 'red', fontSize: '18px' }}>
        <h1>Initialization Error</h1>
        <p>{initializationError}</p>
        <button
          onClick={handleRetry}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry Initialization
        </button>
      </div>
    );
  }

  // Wait for initialization to complete
  if (!isInitialized) {
    return <LoadingComponent />;
  }

  // Create query client with optimized settings
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 60000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });

  return (
    <ErrorBoundary componentName="Application">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingComponent />}>
              <Routes>
                <Route path="/" element={
                  <ErrorBoundary
                    componentName="Dashboard"
                    fallback={<ChunkErrorComponent onRetry={handleRetry} />}
                  >
                    <LazyIndex />
                  </ErrorBoundary>
                } />
                <Route path="/calendar" element={
                  <ErrorBoundary
                    componentName="Calendar"
                    fallback={<ChunkErrorComponent onRetry={handleRetry} />}
                  >
                    <LazyCalendar />
                  </ErrorBoundary>
                } />
                <Route path="/login" element={
                  <ErrorBoundary
                    componentName="Login"
                    fallback={<ChunkErrorComponent onRetry={handleRetry} />}
                  >
                    <LazyLogin />
                  </ErrorBoundary>
                } />
                <Route path="/reset-password" element={
                  <ErrorBoundary
                    componentName="ResetPassword"
                    fallback={<ChunkErrorComponent onRetry={handleRetry} />}
                  >
                    <LazyResetPassword />
                  </ErrorBoundary>
                } />
                <Route path="/update-password" element={
                  <ErrorBoundary
                    componentName="UpdatePassword"
                    fallback={<ChunkErrorComponent onRetry={handleRetry} />}
                  >
                    <LazyUpdatePassword />
                  </ErrorBoundary>
                } />
                <Route path="/nylas-callback" element={
                  <ErrorBoundary
                    componentName="NylasCallback"
                    fallback={<ChunkErrorComponent onRetry={handleRetry} />}
                  >
                    <LazyNylasCallback />
                  </ErrorBoundary>
                } />
                <Route path="/nylas-oauth-callback" element={
                  <ErrorBoundary
                    componentName="NylasOAuthCallback"
                    fallback={<ChunkErrorComponent onRetry={handleRetry} />}
                  >
                    <LazyNylasOAuthCallback />
                  </ErrorBoundary>
                } />
                <Route path="*" element={
                  <ErrorBoundary
                    componentName="NotFound"
                    fallback={<ChunkErrorComponent onRetry={handleRetry} />}
                  >
                    <LazyNotFound />
                  </ErrorBoundary>
                } />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
