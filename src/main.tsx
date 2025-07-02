
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DateTime } from 'luxon';
import { luxonLocalizer } from 'react-big-calendar';

// CRITICAL: Get user timezone and set globally before ANY React components mount
const getUserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
};

// Set global timezone for Luxon BEFORE any calendar components are created
const userTimeZone = getUserTimeZone();
console.log('[main] CRITICAL: Set global Luxon timezone BEFORE React mount:', userTimeZone);

// CRITICAL: Create timezone-aware global localizer instance
// Create a DateTime instance in the user's timezone for the localizer
const timeZoneAwareDateTime = DateTime.local().setZone(userTimeZone);
export const globalLocalizer = luxonLocalizer(DateTime, {
  // Set the timezone for all DateTime operations
  zone: userTimeZone
});
console.log('[main] CRITICAL: Created timezone-aware global Luxon localizer instance with zone:', userTimeZone);

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <App />
  );
}
