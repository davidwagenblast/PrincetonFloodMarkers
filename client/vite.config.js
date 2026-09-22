import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Settings live in one .env file at the repo root, shared with the server (see .env.example).
const envDir = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  // URL path the site is served under, e.g. /PFlood/ for https://example.edu/PFlood/
  const base = `/${(env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
  const api = { target: `http://localhost:${env.API_PORT || 3001}` };

  return {
    base,
    envDir,
    plugins: [react()],
    server: {
      port: 5173,
      // Forward API calls and uploaded photos to the Express server during development
      proxy: {
        [`${base}api`]: api,
        [`${base}uploads`]: api,
      },
    },
  };
});
