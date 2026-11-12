import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' makes the build work from any GitHub Pages sub-path (username.github.io/repo-name/).
// The dev server runs on 127.0.0.1 because Spotify no longer accepts "localhost" redirect URIs.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
})
