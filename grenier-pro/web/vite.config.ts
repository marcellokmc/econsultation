import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// La compilation remplace l'interface servie par le serveur Node (../app/public).
export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: '../app/public',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    rollupOptions: { output: { manualChunks: undefined } },
  },
  server: { port: 4200, proxy: { '/api': 'http://localhost:3000', '/v': 'http://localhost:3000' } },
});
