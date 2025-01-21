import { fileURLToPath, URL } from 'node:url';

import { crx } from '@crxjs/vite-plugin';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

import manifest from './manifest.config.js';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [crx({ manifest }), checker({ typescript: true })],
  // https://github.com/crxjs/chrome-extension-tools/issues/971#issuecomment-2603858845
  legacy: { skipWebSocketTokenCheck: true },
});
