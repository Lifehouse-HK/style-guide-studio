import { defineConfig } from 'vite';
export default defineConfig({
  root: 'apps/editor',
  base: './',
  build: { outDir: '../../dist/editor', emptyOutDir: true },
});
