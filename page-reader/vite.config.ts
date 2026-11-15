import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/gutenberg': {
        target: 'https://www.gutenberg.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/gutenberg/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (response) => {
            const location = response.headers.location
            if (
              typeof location === 'string' &&
              location.startsWith('https://www.gutenberg.org/')
            ) {
              response.headers.location = location.replace(
                'https://www.gutenberg.org',
                '/api/gutenberg',
              )
            }
          })
        },
      },
    },
  },
})
