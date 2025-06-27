
console.log('🚀 [EMERGENCY DEBUG] main.tsx file loaded');

import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('🚀 [EMERGENCY DEBUG] React imports successful');

// Import App component normally
console.log('🚀 [EMERGENCY DEBUG] Attempting to import App...');
let App;
try {
  App = require('./App.tsx').default;
  console.log('🚀 [EMERGENCY DEBUG] App import successful via require');
} catch (error) {
  console.error('❌ [EMERGENCY DEBUG] App import via require failed:', error);
  try {
    // Fallback to ES6 import
    import('./App.tsx').then(module => {
      App = module.default;
      console.log('🚀 [EMERGENCY DEBUG] App import successful via dynamic import');
      renderApp();
    }).catch(importError => {
      console.error('❌ [EMERGENCY DEBUG] Dynamic import failed:', importError);
      renderFallback();
    });
  } catch (fallbackError) {
    console.error('❌ [EMERGENCY DEBUG] All App import methods failed:', fallbackError);
    renderFallback();
  }
}

console.log('🚀 [EMERGENCY DEBUG] Importing CSS...');
import './index.css';
console.log('🚀 [EMERGENCY DEBUG] CSS import successful');

const renderFallback = () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = '<div style="padding: 20px; color: red; font-size: 18px;">EMERGENCY: App import failed!</div>';
  }
};

const renderApp = () => {
  console.log('🚀 [EMERGENCY DEBUG] Looking for root element...');
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ [EMERGENCY DEBUG] Root element not found!");
    document.body.innerHTML = '<div style="padding: 20px; color: red; font-size: 18px;">EMERGENCY: Root element not found!</div>';
  } else {
    console.log('🚀 [EMERGENCY DEBUG] Root element found, creating React root...');
    
    try {
      const root = createRoot(rootElement);
      console.log('🚀 [EMERGENCY DEBUG] React root created, attempting to render...');
      
      root.render(
        React.createElement(React.StrictMode, null,
          React.createElement(App)
        )
      );
      console.log('🚀 [EMERGENCY DEBUG] Render completed successfully!');
    } catch (error) {
      console.error('❌ [EMERGENCY DEBUG] Render failed:', error);
      rootElement.innerHTML = '<div style="padding: 20px; color: red; font-size: 18px;">EMERGENCY: React render failed - ' + error.message + '</div>';
    }
  }
};

// If App was imported synchronously, render immediately
if (App) {
  renderApp();
}
