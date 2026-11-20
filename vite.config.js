import { defineConfig } from 'vite';

export default defineConfig({
  // Chemins relatifs obligatoires pour déploiement sur sous-dossier (ex: GitHub Pages)
  base: './',
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 6000
  },
  server: {
    host: true,
    port: 5173
  }
});
