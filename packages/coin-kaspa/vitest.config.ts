import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000, // 30 seconds for network requests
    hookTimeout: 30000 // 30 seconds for setup/teardown
  }
});
