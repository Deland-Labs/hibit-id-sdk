import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpAgent, AnonymousIdentity } from '@dfinity/agent';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { createAgent } from '@dfinity/utils';
import { AgentManager } from '../src/chain-wallet/shared/agent-manager';
import { ChainInfo, Ecosystem } from '@delandlabs/coin-base';
import { ChainType, ChainNetwork, ChainId, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
// Mock the @dfinity/utils module
vi.mock('@dfinity/utils', () => ({
  createAgent: vi.fn()
}));

// Mock crypto library
vi.mock('@delandlabs/crypto-lib', async () => {
  const actual = await vi.importActual('@delandlabs/crypto-lib');
  return {
    ...actual,
    deriveEcdsaPrivateKey: vi.fn().mockResolvedValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
  };
});

describe('Anonymous Agent for Queries', () => {
  let agentManager: AgentManager;
  let mockAuthenticatedAgent: HttpAgent;
  let mockAnonymousAgent: HttpAgent;
  let identity: Secp256k1KeyIdentity;

  const chainInfo: ChainInfo = {
    chainId: new ChainId(ChainType.Dfinity, ChainNetwork.DfinityMainNet),
    name: 'ICP',
    fullName: 'Internet Computer',
    icon: 'https://icp-api.io/icon.png',
    nativeAssetSymbol: 'ICP',
    supportedSignaturesSchemas: [WalletSignatureSchema.IcpEddsa],
    explorer: 'https://dashboard.internetcomputer.org',
    rpc: {
      primary: 'https://icp-api.io'
    },
    isMainnet: true,
    isNativeGas: true,
    ecosystem: Ecosystem.ICP
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };

  beforeEach(async () => {
    // Create a mock identity object
    identity = {
      getPrincipal: vi.fn().mockReturnValue({
        toText: () => 'test-principal-id',
        isAnonymous: () => false
      }),
      sign: vi.fn().mockResolvedValue(new Uint8Array(64)),
      getPublicKey: vi.fn().mockReturnValue({
        toDer: () => new Uint8Array(65)
      })
    } as any;

    // Mock agent instances
    mockAuthenticatedAgent = {
      rootKey: null,
      call: vi.fn(),
      query: vi.fn(),
      readState: vi.fn()
    } as any;

    mockAnonymousAgent = {
      rootKey: null,
      call: vi.fn(),
      query: vi.fn(),
      readState: vi.fn()
    } as any;

    // Simple counter to track calls
    let callCount = 0;

    // Mock createAgent to return different agents based on call order
    vi.mocked(createAgent).mockImplementation(async (config) => {
      callCount++;
      // First call is for authenticated agent, second is for anonymous
      if (callCount === 1) {
        return mockAuthenticatedAgent;
      } else {
        return mockAnonymousAgent;
      }
    });

    agentManager = new AgentManager(chainInfo, mockLogger as any);
    console.log('Identity before initialize:', identity);
    try {
      await agentManager.initialize(identity);
    } catch (error) {
      console.error('Initialize failed:', error);
      throw error;
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create both authenticated and anonymous agents on initialization', async () => {
    expect(vi.mocked(createAgent)).toHaveBeenCalledTimes(2);

    // Get the actual calls
    const calls = vi.mocked(createAgent).mock.calls;

    // Verify both calls have the correct host
    expect(calls[0][0]).toMatchObject({
      host: 'https://icp-api.io'
    });
    expect(calls[1][0]).toMatchObject({
      host: 'https://icp-api.io'
    });

    // The first call should have the authenticated identity
    expect(calls[0][0].identity).toBe(identity);

    // The second call should have a different identity (anonymous)
    expect(calls[1][0].identity).not.toBe(identity);
  });

  it('should return authenticated agent when calling getAgent()', () => {
    const agent = agentManager.getAgent();
    expect(agent).toBe(mockAuthenticatedAgent);
  });

  it('should return anonymous agent when calling getAnonymousAgent()', () => {
    const agent = agentManager.getAnonymousAgent();
    expect(agent).toBe(mockAnonymousAgent);
  });

  it('should throw error if getAgent() is called before initialization', () => {
    const uninitializedManager = new AgentManager(chainInfo, mockLogger as any);
    expect(() => uninitializedManager.getAgent()).toThrow('Agent not initialized');
  });

  it('should throw error if getAnonymousAgent() is called before initialization', () => {
    const uninitializedManager = new AgentManager(chainInfo, mockLogger as any);
    expect(() => uninitializedManager.getAnonymousAgent()).toThrow('Anonymous agent not initialized');
  });

  it('should report as initialized when both agents are ready', async () => {
    // Make sure initialization completed
    expect(agentManager).toBeDefined();

    // Debug: Check the internal state
    console.log('authenticatedAgent:', (agentManager as any).authenticatedAgent);
    console.log('anonymousAgent:', (agentManager as any).anonymousAgent);
    console.log('identity:', (agentManager as any).identity);

    // AgentManager should report as initialized after successful initialization
    expect(agentManager.isInitialized()).toBe(true);

    // Verify we can get both agents
    expect(() => agentManager.getAgent()).not.toThrow();
    expect(() => agentManager.getAnonymousAgent()).not.toThrow();
  });

  it('should cleanup both agents on cleanup()', () => {
    agentManager.cleanup();
    expect(() => agentManager.getAgent()).toThrow('Agent not initialized');
    expect(() => agentManager.getAnonymousAgent()).toThrow('Anonymous agent not initialized');
    expect(agentManager.isInitialized()).toBe(false);
  });
});
