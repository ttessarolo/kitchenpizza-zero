import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlifyPlugin from '@netlify/vite-plugin-tanstack-start'

// Note: Paraglide JS Vite plugin removed — using custom useT() hook with Zustand instead.
// @inlang/paraglide-js remains installed for potential future type-safe m.key() usage.

export default defineConfig({
  server: {
    allowedHosts: ['promoted-perfectly-vulture.ngrok-free.app'],
  },
  ssr: {
    noExternal: ['@dagrejs/dagre'],
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'app',
    }),
    react(),
    tailwindcss(),
    sentryTanstackStart({
      org: 'radiozero',
      project: 'kitchenpizza',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    netlifyPlugin(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '~': new URL('./app', import.meta.url).pathname,
      '@': new URL('.', import.meta.url).pathname,
      '@commons': new URL('./commons', import.meta.url).pathname,
    },
  },
})
