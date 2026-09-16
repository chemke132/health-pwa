import React from 'react';
import ReactDOM from 'react-dom/client';

import './i18n';
import './index.css';
import App from './App';
import { initAuthListener, useAppStore } from './store/useAppStore';
import { schedulePreloadOcr } from './lib/ocr';
import { registerAutoSync } from './lib/sync';

// Wire Supabase auth -> Zustand store (restores session, loads 30-day cache).
initAuthListener();

// Warm the Tesseract OCR worker in the background so first scan is instant.
schedulePreloadOcr();

// Flush the offline write queue whenever we (re)connect; refresh after a sync.
registerAutoSync(() => {
  if (useAppStore.getState().user) useAppStore.getState().loadAppData();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
