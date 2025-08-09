import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup-no-crypto-mocks.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000, // 30 seconds for network requests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    server: {
      deps: {
        external: ['@ton/ton', '@ton/crypto', '@ton/core']
      }
    }
  }
});
