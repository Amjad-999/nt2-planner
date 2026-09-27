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
        id: '/',
        name: 'NT2 Planner — مخطط الاستعداد لامتحان NT2 (B1)',
        short_name: 'NT2 Planner',
        description: 'منصة شاملة ومجانية للاستعداد لامتحان اللغة الهولندية NT2 على مستوى B1',
        categories: ['education'],
        theme_color: '#E07A3E',
        background_color: '#FAF7F2',
        display: 'standalone',
        dir: 'rtl',
        lang: 'ar',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // jpg is here for the mascot portrait (public/images/cartoon-cat.jpg) — without
        // it the file is never precached, so the icon silently drops to its drawn
        // SVG fallback the moment the app runs offline
        globPatterns: ['**/*.{js,css,html,woff2,png,jpg,svg,ico}'],
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
          /* مصادر كاتيا الحيّة (src/features/world). محتوى موسوعي وقاموسي
             شبه ثابت → CacheFirst لأسبوع، فتُقرأ الاستعلامات المتكرّرة فورًا
             وتظلّ متاحة دون اتصال. */
          {
            urlPattern: /(nl|ar)\.wikipedia\.org/,
            handler: 'CacheFirst',
            options: { cacheName: 'wiki-cache', expiration: { maxEntries: 120, maxAgeSeconds: 604800 } },
          },
          {
            urlPattern: /nl\.wiktionary\.org/,
            handler: 'CacheFirst',
            options: { cacheName: 'wiktionary-cache', expiration: { maxEntries: 200, maxAgeSeconds: 604800 } },
          },
          /* الطقس والأخبار يفقدان قيمتهما إن قدُما: الشبكة أوّلًا، والنسخة
             المخزّنة شبكة أمان قصيرة العمر حين ينقطع الاتصال. */
          {
            urlPattern: /api\.open-meteo\.com/,
            handler: 'NetworkFirst',
            options: { cacheName: 'weather-cache', networkTimeoutSeconds: 5, expiration: { maxEntries: 12, maxAgeSeconds: 3600 } },
          },
          {
            urlPattern: /corsproxy\.io/,
            handler: 'NetworkFirst',
            options: { cacheName: 'news-cache', networkTimeoutSeconds: 6, expiration: { maxEntries: 8, maxAgeSeconds: 1800 } },
          },
          /* صور معاني كلمات مواضيع B1 (Pixabay). كل كلمة تُبحث مرة واحدة
             (يخزّنها src/features/vocab/images.ts في IndexedDB)، فهذا
             تخزين ثانٍ يبقي الصور نفسها متاحة دون اتصال بعد أول عرض. */
          {
            urlPattern: /pixabay\.com\/api/,
            handler: 'CacheFirst',
            options: { cacheName: 'pixabay-api-cache', expiration: { maxEntries: 1500, maxAgeSeconds: 2592000 } },
          },
          {
            urlPattern: /cdn\.pixabay\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'pixabay-img-cache', expiration: { maxEntries: 1500, maxAgeSeconds: 2592000 } },
          },
        ],
      },
    }),
  ],
  // No manualChunks: every heavy library here has a single lazy consumer
  // (dnd-kit→Exercises, markdown→Grammar, chart→Stats, pdf/wavesurfer→Exam),
  // so default chunking already keeps them out of the eager critical path.
  // Hand-grouping them pulled shared modules (react-dom, jsx-runtime,
  // zustand) into those chunks and forced the entry to modulepreload 1.4 MB
  // of lazy vendor code at startup.
})
