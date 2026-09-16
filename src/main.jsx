import React from 'react';
import ReactDOM from 'react-dom/client';

import './i18n';
import './index.css';
import App from './App';
import { initAuthListener } from './store/useAppStore';
import { schedulePreloadOcr } from './lib/ocr';

// Wire Supabase auth -> Zustand store (restores session, loads 30-day cache).
initAuthListener();

// Warm the Tesseract OCR worker in the background so first scan is instant.
schedulePreloadOcr();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
