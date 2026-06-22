import { defineWorkspace } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineWorkspace([
  {
    name: 'main',
    root: '.',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@main': path.resolve(__dirname, './src/main'),
      },
    },
    test: {
      name: 'main',
      include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts'],
      exclude: ['**/e2e/**', 'tests/e2e/**', '**/node_modules/**'],
      environment: 'node',
    },
  },
  {
    name: 'renderer',
    root: '.',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@main': path.resolve(__dirname, './src/main'),
      },
    },
    test: {
      name: 'renderer',
      include: ['src/renderer/**/*.test.tsx', 'src/renderer/**/*.test.ts'],
      exclude: ['**/e2e/**', 'tests/e2e/**', '**/node_modules/**'],
      environment: 'jsdom',
      setupFiles: ['./tests/setup/renderer.ts'],
    },
  },
]);
