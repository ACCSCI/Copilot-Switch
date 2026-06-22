import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron';
  const isServe = process.env.NODE_ENV === 'development';

  const alias = {
    '@': path.resolve(__dirname, './src/renderer'),
    '@shared': path.resolve(__dirname, './src/shared'),
    '@main': path.resolve(__dirname, './src/main'),
    '@preload': path.resolve(__dirname, './src/preload'),
  };

  return {
    plugins: [
      react(),
      isElectron &&
        electron({
          main: {
            entry: 'src/main/index.ts',
            vite: {
              resolve: { alias },
              build: {
                outDir: 'dist/main',
                rollupOptions: {
                  external: ['better-sqlite3', 'electron', 'node:sqlite'],
                },
              },
            },
          },
          preload: {
            input: path.join(__dirname, 'src/preload/index.ts'),
            vite: {
              resolve: { alias },
              build: {
                outDir: 'dist/preload',
                rollupOptions: {
                  external: ['electron'],
                  output: {
                    format: 'cjs',
                    entryFileNames: '[name].cjs',
                  },
                },
              },
            },
          },
          renderer: {},
        }),
    ].filter(Boolean),
    resolve: { alias },
    build: {
      outDir: 'dist/renderer',
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    clearScreen: false,
  };
});
