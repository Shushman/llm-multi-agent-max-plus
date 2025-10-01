import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import path from 'path'

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex]
    }),
    react()
  ],
  server: {
    port: 3000,
    open: true,
    hmr: {
      port: 3001
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  base: process.env.NODE_ENV === 'production' ? '/jkg-shushman/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
})
