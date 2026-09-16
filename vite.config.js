import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Health PWA',
        short_name: 'Health',
        description: 'Adaptive meal / workout / weight tracker',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Pre-cache the app shell (HTML/CSS/JS/icons) so it opens offline.
        // tesseract worker + wasm can be large; load on demand instead.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // SPA: serve index.html for any navigation when offline (no dino page).
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/manifest/, /\.[^/]+$/],
        runtimeCaching: [
          {
            // Supabase REST reads (GET): serve network, fall back to cache offline.
            urlPattern: ({ url, request }) =>
              /\.supabase\.co$/.test(url.hostname) && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts / other static CDNs: fast, revalidate in background.
            urlPattern: ({ url }) =>
              url.hostname.includes('fonts.googleapis.com') ||
              url.hostname.includes('fonts.gstatic.com') ||
              url.hostname.includes('cdn.jsdelivr.net'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-cdn',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
