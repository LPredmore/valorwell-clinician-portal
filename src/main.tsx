
// External dependencies
import React from 'react';
import { createRoot } from 'react-dom/client';

// Components
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';

// Styles
import './index.css';

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Create the React root and render the app
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary componentName="Application Root">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
