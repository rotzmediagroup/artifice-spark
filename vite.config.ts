import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem chunk  
          react: ['react', 'react-dom', 'react-router-dom'],
          // UI components chunk
          ui: [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-avatar',
            '@radix-ui/react-toast',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-popover'
          ],
          // Utility libraries chunk
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority', 'date-fns', 'zod'],
          // Icons and visualization
          icons: ['lucide-react', 'recharts']
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt', 'pwa-128x128.png', 'pwa-256x256.png'],
      manifest: {
        id: 'rotz-image-generator',
        name: 'ROTZ Image Generator',
        short_name: 'ROTZ AI GEN',
        description: 'Professional AI image generation with advanced styling and custom dimensions',
        theme_color: '#8b5cf6',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'graphics', 'utilities', 'entertainment'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-256x256.png',
            sizes: '256x256',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        shortcuts: [
          {
            name: "Generate Image",
            short_name: "Generate",
            description: "Start generating AI images",
            url: "/?action=generate",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
