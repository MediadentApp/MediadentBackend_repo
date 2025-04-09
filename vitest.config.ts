import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '#src': '/src',
    },
  },
});
