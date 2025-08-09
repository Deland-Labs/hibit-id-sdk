import { HttpAgent, AnonymousIdentity } from '@dfinity/agent';
import { createAgent } from '@dfinity/utils';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { NetworkError, HibitIdSdkErrorCode, ILogger, ChainInfo } from '@delandlabs/coin-base';
import { CHAIN_CONFIG } from '../config';

/**
 * Manages the HttpAgent and Identity for Dfinity interactions.
 *
 * This centralizes agent creation and management, making it easier to
 * maintain and share across different asset handlers.
 *
 * Supports both authenticated agents (for transactions) and anonymous agents
 * (for queries). Anonymous agents are faster for read-only operations.
 */
export class AgentManager {
  private authenticatedAgent?: HttpAgent;
  private anonymousAgent?: HttpAgent;
  private identity?: Secp256k1KeyIdentity;

  constructor(
    private readonly chainInfo: ChainInfo,
    private readonly logger: ILogger
  ) {}

  /**
   * Initialize the agent with the provided identity
   * @param identity - The Secp256k1KeyIdentity to use for authentication
   */
  public async initialize(identity: Secp256k1KeyIdentity): Promise<void> {
    try {
      this.identity = identity;

      // Create authenticated agent with the identity and RPC endpoint
      this.authenticatedAgent = await createAgent({
        identity,
        host: this.chainInfo.rpc?.primary
      });

      // Create anonymous agent for faster queries
      this.anonymousAgent = await createAgent({
        identity: new AnonymousIdentity(),
        host: this.chainInfo.rpc?.primary
      });

      this.logger.debug('HttpAgents initialized successfully', {
        context: 'AgentManager.initialize',
        data: { host: this.chainInfo.rpc?.primary }
      });
    } catch (error) {
      this.logger.error('Failed to create HttpAgent', {
        error: error instanceof Error ? error : new Error(String(error)),
        context: 'AgentManager.initialize'
      });
      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_CONFIG.CHAIN_NAME}: Failed to create agent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the authenticated HttpAgent for transactions
   * @returns The authenticated HttpAgent instance
   * @throws Error if agent is not initialized
   */
  public getAgent(): HttpAgent {
    if (!this.authenticatedAgent) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }
    return this.authenticatedAgent;
  }

  /**
   * Get the anonymous HttpAgent for queries
   * @returns The anonymous HttpAgent instance
   * @throws Error if agent is not initialized
   */
  public getAnonymousAgent(): HttpAgent {
    if (!this.anonymousAgent) {
      throw new Error('Anonymous agent not initialized. Call initialize() first.');
    }
    return this.anonymousAgent;
  }

  /**
   * Get the initialized Identity
   * @returns The Secp256k1KeyIdentity instance
   * @throws Error if identity is not initialized
   */
  public getIdentity(): Secp256k1KeyIdentity {
    if (!this.identity) {
      throw new Error('Identity not initialized. Call initialize() first.');
    }
    return this.identity;
  }

  /**
   * Check if the agent is initialized
   * @returns True if agent is ready to use
   */
  public isInitialized(): boolean {
    return this.authenticatedAgent !== undefined && this.anonymousAgent !== undefined && this.identity !== undefined;
  }

  /**
   * Clean up resources and references
   */
  public cleanup(): void {
    this.authenticatedAgent = undefined;
    this.anonymousAgent = undefined;
    this.identity = undefined;
    this.logger.debug('Agent manager resources cleaned up', {
      context: 'AgentManager.cleanup'
    });
  }
}
