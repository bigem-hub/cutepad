import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@cutepad\/core$/, replacement: path.resolve(__dirname, '../../packages/core/src/index.ts') },
      { find: /^@cutepad\/core\//, replacement: `${path.resolve(__dirname, '../../packages/core/src')}/` },
      { find: /^@cutepad\/ui$/, replacement: path.resolve(__dirname, '../../packages/ui/src/index.ts') },
      { find: /^@cutepad\/ui\//, replacement: `${path.resolve(__dirname, '../../packages/ui/src')}/` },
      { find: /^@\//, replacement: `${path.resolve(__dirname, 'src')}/` },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
