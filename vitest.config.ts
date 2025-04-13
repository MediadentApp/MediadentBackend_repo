import './loadenv.js';

import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    testTimeout: 15000,
    hookTimeout: 30000,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    include: ['src/tests/**/*.test.ts'],
    // sequence: { concurrent: true },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
    // setupFiles: ['src/tests/setup.ts'],
    setupFiles: process.env.USE_IN_MEMORY_DB === 'true' ? 'src/tests/setup.memory.ts' : 'src/tests/setup.ts',
  },
  resolve: {
    alias: {
      '#src': '/src',
    },
  },
});
