import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');
  const isProdMode = mode === 'production';
  if (isProdMode && env.VITE_SEED_DATABASE === 'true') {
    throw new Error(
      'Security check failed: VITE_SEED_DATABASE=true is blocked for production builds.'
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.{test,spec}.{js,jsx}'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json-summary'],
        reportsDirectory: './coverage',
        all: true,
        include: ['src/**/*.{js,jsx}'],
        exclude: [
          'src/**/*.test.{js,jsx}',
          'src/**/*.spec.{js,jsx}',
          'src/test/**',
          'src/main.jsx',
        ],
        thresholds: {
          statements: 30,
          branches: 70,
          functions: 60,
          lines: 30,
        },
      },
    },
  };
})
