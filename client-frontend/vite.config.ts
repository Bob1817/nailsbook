import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'react';
          }
          if (id.includes('/socket.io-client/') || id.includes('/engine.io-client/')) {
            return 'realtime';
          }
          if (id.includes('/axios/') || id.includes('/dayjs/')) {
            return 'utilities';
          }
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://api.lunails.cn',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://api.lunails.cn',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://api.lunails.cn',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
