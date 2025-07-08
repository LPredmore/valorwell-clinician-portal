
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DateTime, Settings } from 'luxon';
import { luxonLocalizer } from 'react-big-calendar';

// CRITICAL: Remove browser timezone dependency - force explicit timezone usage
// Set Luxon to UTC mode to prevent any accidental browser timezone usage
Settings.defaultZone = 'utc';

// CRITICAL: Create timezone-neutral localizer - all timezone handling must be explicit
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
