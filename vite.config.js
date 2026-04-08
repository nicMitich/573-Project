import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: {
      '/chat': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/neo4j': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/parse-resume': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
})