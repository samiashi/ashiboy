import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the built site works from any location:
  // domain root, subpath, or static hosts like GitHub Pages project sites.
  base: './',
  // `@/` alias for src — mirrors tsconfig paths. Keeps imports stable no
  // matter how deep a file lives (enforced by `npm run lint`).
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [react()],
  build: {
    // Never inline assets as data URLs — tile art would bloat the initial JS
    // instead of loading lazily via <img>.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Keep the initial download small and parallelizable: framework,
        // animation, net, and QR code each get their own hashed chunk instead
        // of one 300K+ serial download.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react-dom/') ||
              id.includes('/react/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (/\/motion(-dom)?\//.test(id)) return 'vendor-motion';
            if (id.includes('/peerjs')) return 'vendor-peer';
            if (id.includes('react-qr-code') || id.includes('/qr.js')) return 'vendor-qr';
          }
        },
      },
    },
  },
  test: {
    // Engine tests run in node; UI tests opt into happy-dom per file via
    // `// @vitest-environment happy-dom`.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    // UI tests assert structure and behavior, never animation physics —
    // `motion/react` is swapped for a DOM stub (see test-motion-stub.tsx).
    // motion-dom drives WAAPI animations that happy-dom can't run cleanly.
    alias: {
      'motion/react': fileURLToPath(new URL('./src/test-motion-stub.tsx', import.meta.url)),
    },
  },
});
