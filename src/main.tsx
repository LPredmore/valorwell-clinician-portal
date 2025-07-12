
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DateTime } from 'luxon';
import { luxonLocalizer } from 'react-big-calendar';

// CRITICAL: Use browser's timezone exclusively - no global zone override
// React Big Calendar will now use browser's local timezone for all operations

// Create localizer using browser's default timezone
export const globalLocalizer = luxonLocalizer(DateTime);
console.log('[main] ELIMINATED: Browser timezone dependency - using UTC default with explicit timezone handling');

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <App />
  );
}
