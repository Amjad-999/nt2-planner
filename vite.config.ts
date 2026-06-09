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
      registerType: 'prompt',
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
          { urlPattern: /streamelements\.com/, handler: 'NetworkOnly' },
          { urlPattern: /translate\.google\.com/, handler: 'NetworkOnly' },
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('three') || id.includes('@react-three')) return 'three-core'
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'chart'
          if (id.includes('framer-motion') || id.includes('gsap')) return 'motion'
          if (id.includes('react-pdf') || id.includes('pdfjs-dist')) return 'pdf'
          if (id.includes('wavesurfer')) return 'audio'
        },
      },
    },
  },
})
