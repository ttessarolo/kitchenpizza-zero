import { defineConfig } from 'vite'
import { paraglide } from '@inlang/paraglide-js'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlifyPlugin from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  server: {
    allowedHosts: ['promoted-perfectly-vulture.ngrok-free.app'],
  },
  plugins: [
    paraglide({
      project: './project.inlang',
      outdir: './app/paraglide',
    }),
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
