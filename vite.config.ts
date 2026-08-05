import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // amazon-cognito-identity-js bundles a Node `buffer` shim that references
  // the bare `global` identifier, which does not exist in the browser under
  // Vite/esbuild (unlike webpack, which auto-polyfills it). Without this,
  // the whole app fails to mount with "global is not defined". The
  // top-level `define` covers application code; `optimizeDeps` needs its
  // own `define` because dependency pre-bundling runs as a separate esbuild
  // pass that does not inherit it.
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    rolldownOptions: {
      transform: {
        define: {
          global: 'globalThis',
        },
      },
    },
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // Protected API responses must never be cached by the service worker.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
      manifest: {
        name: 'Todone',
        short_name: 'Todone',
        description: 'Private family task tracking',
        theme_color: '#14532d',
        background_color: '#f0fdf4',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
