
console.log('🚀 [EMERGENCY DEBUG] App.tsx file loaded');

import React from "react";

console.log('🚀 [EMERGENCY DEBUG] React import in App successful');

// Check environment variables first
console.log('🚀 [EMERGENCY DEBUG] Checking environment variables...');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🚀 [EMERGENCY DEBUG] Supabase URL:', supabaseUrl ? 'SET' : 'MISSING');
console.log('🚀 [EMERGENCY DEBUG] Supabase Key:', supabaseKey ? 'SET' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [EMERGENCY DEBUG] Missing Supabase environment variables');
  const ErrorApp = () => (
    <div style={{ padding: '20px', color: 'red', fontSize: '18px' }}>
      <h1>Configuration Error</h1>
      <p>Missing Supabase environment variables:</p>
      <ul>
        <li>VITE_SUPABASE_URL: {supabaseUrl ? '✓ SET' : '❌ MISSING'}</li>
        <li>VITE_SUPABASE_ANON_KEY: {supabaseKey ? '✓ SET' : '❌ MISSING'}</li>
      </ul>
    </div>
  );
  export default ErrorApp;
}

// Try importing other dependencies
let QueryClient, QueryClientProvider, BrowserRouter, Routes, Route;
let AuthProvider, ErrorBoundary;

try {
  console.log('🚀 [EMERGENCY DEBUG] Importing TanStack Query...');
  const queryImports = await import("@tanstack/react-query");
  QueryClient = queryImports.QueryClient;
  QueryClientProvider = queryImports.QueryClientProvider;
  console.log('🚀 [EMERGENCY DEBUG] TanStack Query imports successful');
} catch (error) {
  console.error('❌ [EMERGENCY DEBUG] TanStack Query import failed:', error);
}

try {
  console.log('🚀 [EMERGENCY DEBUG] Importing React Router...');
  const routerImports = await import("react-router-dom");
  BrowserRouter = routerImports.BrowserRouter;
  Routes = routerImports.Routes;
  Route = routerImports.Route;
  console.log('🚀 [EMERGENCY DEBUG] React Router imports successful');
} catch (error) {
  console.error('❌ [EMERGENCY DEBUG] React Router import failed:', error);
}

try {
  console.log('🚀 [EMERGENCY DEBUG] Importing AuthProvider...');
  const authImports = await import("@/context/AuthProvider");
  AuthProvider = authImports.AuthProvider;
  console.log('🚀 [EMERGENCY DEBUG] AuthProvider import successful');
} catch (error) {
  console.error('❌ [EMERGENCY DEBUG] AuthProvider import failed:', error);
}

try {
  console.log('🚀 [EMERGENCY DEBUG] Importing ErrorBoundary...');
  const errorImports = await import("./components/common/ErrorBoundary");
  ErrorBoundary = errorImports.default;
  console.log('🚀 [EMERGENCY DEBUG] ErrorBoundary import successful');
} catch (error) {
  console.error('❌ [EMERGENCY DEBUG] ErrorBoundary import failed:', error);
}

// Create a minimal fallback if imports failed
if (!QueryClient || !QueryClientProvider || !BrowserRouter || !Routes || !Route || !AuthProvider || !ErrorBoundary) {
  console.error('❌ [EMERGENCY DEBUG] Critical imports failed, using minimal fallback');
  const MinimalApp = () => (
    <div style={{ padding: '20px', fontSize: '18px' }}>
      <h1>ValorWell EHR - Emergency Mode</h1>
      <p>Application is running in emergency mode due to import failures.</p>
      <p>Check the console for detailed error information.</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <strong>Import Status:</strong>
        <ul>
          <li>QueryClient: {QueryClient ? '✓' : '❌'}</li>
          <li>React Router: {BrowserRouter ? '✓' : '❌'}</li>
          <li>AuthProvider: {AuthProvider ? '✓' : '❌'}</li>
          <li>ErrorBoundary: {ErrorBoundary ? '✓' : '❌'}</li>
        </ul>
      </div>
    </div>
  );
  export default MinimalApp;
}

console.log('🚀 [EMERGENCY DEBUG] All critical imports successful, creating query client...');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Reduced retry to speed up debugging
      staleTime: 60000,
    },
  },
});

console.log('🚀 [EMERGENCY DEBUG] Query client created successfully');

/**
 * Main App component with emergency debugging
 */
const App = () => {
  console.log('🚀 [EMERGENCY DEBUG] App component rendering...');

  try {
    return (
      <ErrorBoundary componentName="Application">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Minimal route for debugging */}
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
        <p>App component failed to render: {error.message}</p>
      </div>
    );
  }
};

console.log('🚀 [EMERGENCY DEBUG] App component defined successfully');

export default App;
