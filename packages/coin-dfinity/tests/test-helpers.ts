import { vi } from 'vitest';
import type { ILogger } from '@delandlabs/coin-base';
import type { HttpAgent } from '@dfinity/agent';
import type { AgentManager } from '../src/chain-wallet/shared/agent-manager';

export function createMockLogger(): ILogger {
  const logger: ILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => logger)
  };
  return logger;
}

export function createMockAgent(): Partial<HttpAgent> {
  return {
    rootKey: null,
    call: vi.fn(),
    query: vi.fn(),
    readState: vi.fn()
  };
}

export function createMockAgentManager(agent: Partial<HttpAgent>): Partial<AgentManager> {
  return {
    getAgent: vi.fn().mockReturnValue(agent),
    getAnonymousAgent: vi.fn().mockReturnValue(agent),
    isInitialized: vi.fn().mockReturnValue(true)
  };
}

export function createMockLedger() {
  return {
    accountBalance: vi.fn(),
    transfer: vi.fn(),
    transactionFee: vi.fn()
  };
}

export function createMockIcrcLedger() {
  return {
    balance: vi.fn(),
    transfer: vi.fn(),
    transactionFee: vi.fn(),
    metadata: vi.fn()
  };
}
