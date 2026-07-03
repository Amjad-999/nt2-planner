import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: new deployments activate silently on next visit — the old
      // confirm() prompt left users stuck on stale builds when dismissed
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'NT2 Planner — مخطط الاستعداد لامتحان NT2 (B1)',
        short_name: 'NT2 Planner',
        description: 'منصة شاملة ومجانية للاستعداد لامتحان اللغة الهولندية NT2 على مستوى B1',
        theme_color: '#109B8E',
        background_color: '#E8EEEC',
        display: 'standalone',
        dir: 'rtl',
        lang: 'ar',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        runtimeCaching: [
          { urlPattern: /translate\.google\.com/, handler: 'NetworkOnly' },
          { urlPattern: /translate\.googleapis\.com/, handler: 'NetworkOnly' },
          {
            urlPattern: /mymemory\.translated\.net/,
            handler: 'CacheFirst',
            options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 604800 } },
          },
          { urlPattern: /fonts\.googleapis\.com/, handler: 'StaleWhileRevalidate' },
          { urlPattern: /fonts\.gstatic\.com/, handler: 'CacheFirst' },
        ],
      },
    }),
  ],
  // No manualChunks: every heavy library here has a single lazy consumer
  // (three→3D hero, dnd-kit→Exercises, markdown→Grammar, chart→Stats,
  // pdf/wavesurfer→Exam), so default chunking already keeps them out of the
  // eager critical path. Hand-grouping them pulled shared modules (react-dom,
  // jsx-runtime, zustand) into those chunks and forced the entry to
  // modulepreload 1.4 MB of lazy vendor code at startup.
})
