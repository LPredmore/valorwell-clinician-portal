
console.log('🚀 [EMERGENCY DEBUG] App.tsx file loaded');

import React from "react";

console.log('🚀 [EMERGENCY DEBUG] React import in App successful');

// Check environment variables first
console.log('🚀 [EMERGENCY DEBUG] Checking environment variables...');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🚀 [EMERGENCY DEBUG] Supabase URL:', supabaseUrl ? 'SET' : 'MISSING');
console.log('🚀 [EMERGENCY DEBUG] Supabase Key:', supabaseKey ? 'SET' : 'MISSING');

// Early return component if environment variables are missing
const MissingEnvComponent = () => (
  <div style={{ padding: '20px', color: 'red', fontSize: '18px' }}>
    <h1>Configuration Error</h1>
    <p>Missing Supabase environment variables:</p>
    <ul>
      <li>VITE_SUPABASE_URL: {supabaseUrl ? '✓ SET' : '❌ MISSING'}</li>
      <li>VITE_SUPABASE_ANON_KEY: {supabaseKey ? '✓ SET' : '❌ MISSING'}</li>
    </ul>
  </div>
);

// Minimal fallback component
const MinimalFallbackComponent = ({ importStatus }: { importStatus: Record<string, boolean> }) => (
  <div style={{ padding: '20px', fontSize: '18px' }}>
    <h1>ValorWell EHR - Emergency Mode</h1>
    <p>Application is running in emergency mode due to import failures.</p>
    <p>Check the console for detailed error information.</p>
    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
      <strong>Import Status:</strong>
      <ul>
        {Object.entries(importStatus).map(([key, status]) => (
          <li key={key}>{key}: {status ? '✓' : '❌'}</li>
        ))}
      </ul>
    </div>
  </div>
);

/**
 * Main App component with emergency debugging
 */
const App = () => {
  console.log('🚀 [EMERGENCY DEBUG] App component rendering...');

  // Check environment variables early
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ [EMERGENCY DEBUG] Missing Supabase environment variables');
    return <MissingEnvComponent />;
  }

  // Dynamic imports with error handling
  const [importStatus, setImportStatus] = React.useState({
    QueryClient: false,
    ReactRouter: false,
    AuthProvider: false,
    ErrorBoundary: false
  });

  const [components, setComponents] = React.useState<{
    QueryClient?: any;
    QueryClientProvider?: any;
    BrowserRouter?: any;
    Routes?: any;
    Route?: any;
    AuthProvider?: any;
    ErrorBoundary?: any;
  }>({});

  const [loadingComplete, setLoadingComplete] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const loadComponents = async () => {
      const newImportStatus = { ...importStatus };
      const newComponents: any = {};

      try {
        console.log('🚀 [EMERGENCY DEBUG] Importing TanStack Query...');
        const queryImports = await import("@tanstack/react-query");
        newComponents.QueryClient = queryImports.QueryClient;
        newComponents.QueryClientProvider = queryImports.QueryClientProvider;
        newImportStatus.QueryClient = true;
        console.log('🚀 [EMERGENCY DEBUG] TanStack Query imports successful');
      } catch (error) {
        console.error('❌ [EMERGENCY DEBUG] TanStack Query import failed:', error);
      }

      try {
        console.log('🚀 [EMERGENCY DEBUG] Importing React Router...');
        const routerImports = await import("react-router-dom");
        newComponents.BrowserRouter = routerImports.BrowserRouter;
        newComponents.Routes = routerImports.Routes;
        newComponents.Route = routerImports.Route;
        newImportStatus.ReactRouter = true;
        console.log('🚀 [EMERGENCY DEBUG] React Router imports successful');
      } catch (error) {
        console.error('❌ [EMERGENCY DEBUG] React Router import failed:', error);
      }

      try {
        console.log('🚀 [EMERGENCY DEBUG] Importing AuthProvider...');
        const authImports = await import("@/context/AuthProvider");
        newComponents.AuthProvider = authImports.AuthProvider;
        newImportStatus.AuthProvider = true;
        console.log('🚀 [EMERGENCY DEBUG] AuthProvider import successful');
      } catch (error) {
        console.error('❌ [EMERGENCY DEBUG] AuthProvider import failed:', error);
      }

      try {
        console.log('🚀 [EMERGENCY DEBUG] Importing ErrorBoundary...');
        const errorImports = await import("./components/common/ErrorBoundary");
        newComponents.ErrorBoundary = errorImports.default;
        newImportStatus.ErrorBoundary = true;
        console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary import successful');
      } catch (error) {
        console.error('❌ [EMERGENCY DEBUG] ErrorBoundary import failed:', error);
      }

      if (mounted) {
        setImportStatus(newImportStatus);
        setComponents(newComponents);
        setLoadingComplete(true);
      }
    };

    loadComponents();

    return () => {
      mounted = false;
    };
  }, []);

  if (!loadingComplete) {
    return (
      <div style={{ padding: '20px', fontSize: '18px' }}>
        <h1>ValorWell EHR - Loading...</h1>
        <p>Initializing application components...</p>
      </div>
    );
  }

  // Check if all critical imports succeeded
  const allImportsSuccessful = Object.values(importStatus).every(Boolean);

  if (!allImportsSuccessful) {
    console.error('❌ [EMERGENCY DEBUG] Critical imports failed, using minimal fallback');
    return <MinimalFallbackComponent importStatus={importStatus} />;
  }

  console.log('🚀 [EMERGENCY DEBUG] All critical imports successful, creating query client...');

  const queryClient = new components.QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 60000,
      },
    },
  });

  console.log('🚀 [EMERGENCY DEBUG] Query client created successfully');

  try {
    const { QueryClientProvider, AuthProvider, BrowserRouter, Routes, Route, ErrorBoundary } = components;

    return (
      <ErrorBoundary componentName="Application">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route 
                  path="/*" 
                  element={
                    <div style={{ padding: '20px', fontSize: '18px' }}>
                      <h1>ValorWell EHR - Debug Mode</h1>
                      <p>Application loaded successfully!</p>
                      <p>Current route: {window.location.pathname}</p>
                      <p>Time: {new Date().toLocaleString()}</p>
                      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                        <strong>✅ All systems operational in debug mode</strong>
                      </div>
                    </div>
                  } 
                />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('❌ [EMERGENCY DEBUG] App render failed:', error);
    return (
      <div style={{ padding: '20px', color: 'red', fontSize: '18px' }}>
        <h1>Render Error</h1>
        <p>App component failed to render: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
};

console.log('🚀 [EMERGENCY DEBUG] App component defined successfully');

export default App;
