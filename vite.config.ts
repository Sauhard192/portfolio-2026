import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mediaContent } from './build/mediaContent.ts'

export default defineConfig({
  plugins: [react(), mediaContent()],
  base: '/portfolio-2026',
})
