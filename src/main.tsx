
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import moment from 'moment-timezone';

// FIXED: Initialize moment timezone globally with a default that will be updated per user
// This provides a stable base configuration that individual components can then customize
moment.tz.setDefault('America/New_York');
console.log('[main] FIXED: Initialized global moment timezone with default:', moment.tz.guess());

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <App />
  );
}
