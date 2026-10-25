import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Background of the art (style B): splash, standalone window and status bar.
const SFONDO = '#201033';

// BASE_PATH is set by the GitHub Pages workflow ("/MaranzaSimulator/"); local dev serves from "/".
// The PWA takes scope and start_url from the same base.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Maranza Simulator',
        short_name: 'Maranza',
        description: 'Life-sim satirico 2D: una settimana da maranza.',
        lang: 'it',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: SFONDO,
        background_color: SFONDO,
        icons: [
          { src: 'icons/icona-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icona-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // offline: app, data and every image of public/art (about 5 MB)
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,png,svg,ico,json,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
