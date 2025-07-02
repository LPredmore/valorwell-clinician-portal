
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import moment from 'moment-timezone';

// Initialize moment timezone globally - this will be set dynamically per user
// For now, we set a default that will be overridden when user timezone is known
moment.tz.setDefault('America/New_York');

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
} else {
  const root = createRoot(rootElement);
  root.render(
    <App />
  );
}
