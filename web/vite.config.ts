import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Production assets live under Django's STATIC_URL.
  base: command === 'build' ? '/static/frontend/' : '/',
  build: {
    outDir: path.resolve(__dirname, '../static/frontend'),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Forward /api/* to the local Django backend during development.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
}))
