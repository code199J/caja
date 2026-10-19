import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: la app funciona igual en localhost, en la red local o en GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
  },
  server: {
    host: true,
    port: 5188,
  },
  preview: {
    host: true,
    port: 4188,
  },
})
