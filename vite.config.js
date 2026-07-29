import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // deploy mới -> SW tự cập nhật ngầm
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'img/hero.webp'],
      manifest: {
        name: 'Bản đồ La Vang',
        short_name: 'La Vang',
        description: 'Bản đồ Trung tâm Hành hương Đức Mẹ La Vang',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#06142e',
        theme_color: '#06142e',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache "vỏ app": JS/CSS/HTML/font — mở lại tức thì, chạy offline.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Bản đồ nền + overlay khuôn viên: dùng tới đâu lưu tới đó.
            urlPattern: ({ url }) => url.pathname.startsWith('/map/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'lavang-map',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Ảnh minh họa POI (~10MB): KHÔNG precache, chỉ cache khi user mở.
            urlPattern: ({ url }) => url.pathname.startsWith('/img/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'lavang-poi-img',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
