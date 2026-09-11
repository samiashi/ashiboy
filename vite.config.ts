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
