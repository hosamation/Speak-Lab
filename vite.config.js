import { defineConfig } from 'vite';

// Speak Lab is a vanilla HTML/JS app. Vite serves index.html at the root and
// handles the `import ... from './data/*.json'` lines that a bare browser
// can't resolve.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    host: true,
    port: 8080,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 8080,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
});
