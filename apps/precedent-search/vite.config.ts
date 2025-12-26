/// <reference types="vite/client" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  // Security guard (SRS §7.3.7): Demo Mode must never be enabled in production builds.
  if (env.VITE_ENV === 'production' && env.VITE_DEMO_MODE === 'true') {
    throw new Error(
      '[VNlaw] Invalid configuration: VITE_DEMO_MODE=true is forbidden when VITE_ENV=production.',
    );
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});
