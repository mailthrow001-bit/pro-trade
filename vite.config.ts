import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'IndiTrade Pro',
        short_name: 'IndiTrade',
        description: 'Indian Paper Trading Platform with Real Data',
        theme_color: '#ffffff',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Do not cache API calls to Yahoo Finance, we want these fresh
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*finance\.yahoo\.com\/.*$/,
          handler: 'NetworkOnly',
        }, {
          urlPattern: /^https:\/\/.*proxy.*$/,
          handler: 'NetworkOnly',
        }]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
  },
  server: {
    port: 3000,
  }
});