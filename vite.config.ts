import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages project site: set PAGES_BASE=/baseball-deck-game/ in CI
  base: process.env.PAGES_BASE || '/',
})
