import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['soma-a-reader-of-pages.onrender.com'],
  },
  server: {
    proxy: {
      '/api/gutenberg': {
        target: 'https://aleph.pglaf.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const ebook = path.match(
            /^\/api\/gutenberg\/ebooks\/(\d+)\.epub3?\.(images|noimages)$/,
          )
          if (ebook) {
            const [, id, imageVariant] = ebook
            return `/cache/epub/${id}/pg${id}${imageVariant === 'images' ? '-images' : ''}.epub`
          }
          return path.replace(/^\/api\/gutenberg/, '')
        },
      },
    },
  },
})
