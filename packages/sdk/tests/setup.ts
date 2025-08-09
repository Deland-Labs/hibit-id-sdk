import { vi } from 'vitest';

// Mock browser APIs only if window exists (jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768
  });
}

// Mock setInterval/clearInterval to avoid issues with timers in tests
global.setInterval = vi.fn((callback, delay) => {
  return setTimeout(callback, delay);
});

global.clearInterval = vi.fn((id) => {
  clearTimeout(id);
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  debug: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};
