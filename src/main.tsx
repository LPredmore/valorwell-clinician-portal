
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DateTime, Settings } from 'luxon';
import { luxonLocalizer } from 'react-big-calendar';

// CRITICAL: Get user timezone and set globally before ANY React components mount
const getUserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
};

// CRITICAL: Set global timezone for Luxon BEFORE any calendar components are created
const userTimeZone = getUserTimeZone();
console.log('[main] CRITICAL: Setting global Luxon default zone BEFORE React mount:', userTimeZone);

// CRITICAL: Use Settings.defaultZoneName (not defaultZone) to bind Luxon globally
Settings.defaultZoneName = userTimeZone;

// CRITICAL: Create the localizer with the globally bound zone
export const globalLocalizer = luxonLocalizer(DateTime);
console.log('[main] CRITICAL: Created timezone-aware global Luxon localizer with bound zone:', userTimeZone);

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <App />
  );
}
