import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// FIX: newer esbuild versions refuse vite's default browser list (it contains Safari 14,
// which has a destructuring bug). Using plain "es2020" works with every esbuild version.
export default defineConfig({
  plugins: [react()],
  esbuild: { target: 'es2020' },
  build: { target: 'es2020' },
  optimizeDeps: { esbuildOptions: { target: 'es2020' } },
  server: {
    port: 5173,
    // send /api calls to the express server
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  test: { environment: 'node' },
});
