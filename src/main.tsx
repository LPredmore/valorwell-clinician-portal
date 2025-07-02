
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DateTime } from 'luxon';

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
console.log('[main] FIXED: Set global Luxon timezone BEFORE React mount:', userTimeZone);

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <App />
  );
}
