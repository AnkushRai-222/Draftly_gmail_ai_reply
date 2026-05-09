import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      // Proxy only backend auth routes — NOT /auth/callback (handled by React Router)
      '^/auth/(?!callback)': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
