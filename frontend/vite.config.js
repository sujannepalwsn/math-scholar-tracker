import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Client port
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Backend API port
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
