import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packages = path.resolve(__dirname, '..', '..', 'packages');

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util'],
    }),
  ],
  optimizeDeps: {
    exclude: ['@miden-sdk/miden-sdk'],
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@miden-sdk/miden-wallet-adapter-base': path.resolve(packages, 'core', 'base', 'index.ts'),
      '@miden-sdk/miden-wallet-adapter-react': path.resolve(packages, 'core', 'react', 'index.ts'),
      '@miden-sdk/miden-wallet-adapter-miden': path.resolve(packages, 'wallets', 'miden', 'index.ts'),
      '@miden-sdk/miden-wallet-adapter-reactui/styles.css': path.resolve(packages, 'ui', 'styles.css'),
      '@miden-sdk/miden-wallet-adapter-reactui': path.resolve(packages, 'ui', 'src', 'index.ts'),
      '@miden-sdk/miden-sdk': path.resolve(__dirname, '..', '..', 'node_modules', '@miden-sdk', 'miden-sdk'),
    },
    dedupe: ['@miden-sdk/miden-sdk', 'react', 'react-dom'],
  },
  worker: {
    format: 'es',
  },
});
