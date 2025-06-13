
console.log('🚀 [EMERGENCY DEBUG] main.tsx file loaded');

import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('🚀 [EMERGENCY DEBUG] React imports successful');

// Check if App import will work
let App;
try {
  console.log('🚀 [EMERGENCY DEBUG] Attempting to import App...');
  App = (await import('./App.tsx')).default;
  console.log('🚀 [EMERGENCY DEBUG] App import successful');
} catch (error) {
  console.error('❌ [EMERGENCY DEBUG] App import failed:', error);
  // Create a fallback minimal app
  App = () => React.createElement('div', { style: { padding: '20px', fontSize: '18px' } }, 'Emergency fallback - App import failed');
}

console.log('🚀 [EMERGENCY DEBUG] Importing CSS...');
import './index.css';
console.log('🚀 [EMERGENCY DEBUG] CSS import successful');

console.log('🚀 [EMERGENCY DEBUG] Looking for root element...');
const rootElement = document.getElementById("root");

// Make sure the root element exists before rendering
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
