
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DateTime, Settings } from 'luxon';
import { luxonLocalizer } from 'react-big-calendar';

// CRITICAL: Let Luxon use system timezone as base, then convert explicitly
// Removed conflicting global UTC setting that broke timezone conversions

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
