import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    environment: 'node',
    // Fix CI worker crashes by limiting concurrency
    pool: 'threads',
    poolOptions: {
      threads: {
        // Reduce threads in CI to prevent worker crashes
        minThreads: 1,
        maxThreads: process.env.CI ? 2 : 4,
        // Isolate each test file to prevent resource conflicts
        isolate: true
      }
    },
    // Increase timeouts for CI stability
    testTimeout: process.env.CI ? 30000 : 10000,
    hookTimeout: process.env.CI ? 30000 : 10000,
    // Reduce memory pressure
    maxConcurrency: process.env.CI ? 2 : 5,
    // Ensure proper cleanup between tests
    sequence: {
      hooks: 'stack'
    },
    // Bail early if too many tests fail
    bail: process.env.CI ? 3 : 0,
    // Better error reporting
    reporter: process.env.CI ? ['verbose', 'junit'] : 'default',
    outputFile: {
      junit: './test-results.xml'
    }
  },
  resolve: {
    alias: {
      src: resolve(__dirname, 'src')
    }
  }
});
