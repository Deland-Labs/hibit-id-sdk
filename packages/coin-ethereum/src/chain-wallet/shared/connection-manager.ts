import { JsonRpcProvider, WebSocketProvider, Wallet } from 'ethers';
import { LRUCache } from 'lru-cache';
import { NetworkError, HibitIdSdkErrorCode, ILogger, ChainInfo } from '@delandlabs/coin-base';
import { CACHE_CONFIG, ETHEREUM_NETWORK } from '../config';

/**
 * Manages Ethereum network connections and wallet instances.
 *
 * This centralizes provider creation, caching, and WebSocket reconnection logic,
 * making it easier to maintain and share across different asset handlers.
 *
 * Features:
 * - Automatic provider selection (HTTP vs WebSocket)
 * - Provider connection pooling with LRU cache
 * - WebSocket auto-reconnection with exponential backoff
 * - Wallet instance lifecycle management
 */
export class ConnectionManager {
  private wallet: Wallet | null = null;
  private readonly providerCache: LRUCache<string, JsonRpcProvider | WebSocketProvider>;
  private readonly reconnectAttempts: Record<string, number> = {};

  // Import configuration from centralized config

  constructor(
    private readonly chainInfo: ChainInfo,
    private readonly logger: ILogger
  ) {
    // Initialize provider cache with disposal callback
    this.providerCache = new LRUCache<string, JsonRpcProvider | WebSocketProvider>({
      max: CACHE_CONFIG.SIZE.PROVIDER,
      dispose: this.disposeProvider.bind(this)
    });
  }

  /**
   * Initialize the connection manager with a wallet instance
   * @param wallet The Ethers wallet instance to use for transactions
   */
  public initialize(wallet: Wallet): void {
    this.wallet = wallet;
    this.logger.debug('Connection manager initialized', {
      context: 'ConnectionManager.initialize',
      data: { address: wallet.address }
    });
  }

  /**
   * Get or create a provider for the given chain info
   * @param chainInfo Optional chain info, defaults to the instance chain info
   * @returns The provider instance
   */
  public getProvider(chainInfo?: ChainInfo): JsonRpcProvider | WebSocketProvider {
    const targetChainInfo = chainInfo || this.chainInfo;
    const key = this.getProviderKey(targetChainInfo);

    // Check cache first
    let provider = this.providerCache.get(key);
    if (provider) {
      return provider;
    }

    // Create new provider
    provider = this.createProvider(targetChainInfo, key);
    this.providerCache.set(key, provider);

    return provider;
  }

  /**
   * Get the initialized wallet instance
   * @returns The Ethers wallet instance
   * @throws Error if wallet is not initialized
   */
  public getWallet(): Wallet {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }
    return this.wallet;
  }

  /**
   * Get a wallet connected to a specific provider
   * @param provider The provider to connect to
   * @returns The connected wallet instance
   */
  public getConnectedWallet(provider: JsonRpcProvider | WebSocketProvider): Wallet {
    const wallet = this.getWallet();
    return wallet.connect(provider);
  }

  /**
   * Check if the connection manager is initialized
   * @returns True if wallet is ready to use
   */
  public isInitialized(): boolean {
    return this.wallet !== null;
  }

  /**
   * Clean up resources and references
   */
  public cleanup(): void {
    // Clear all providers
    this.providerCache.clear();

    // Clear wallet reference
    this.wallet = null;

    // Clear reconnection attempts
    Object.keys(this.reconnectAttempts).forEach((key) => {
      delete this.reconnectAttempts[key];
    });

    this.logger.debug('Connection manager resources cleaned up', {
      context: 'ConnectionManager.cleanup'
    });
  }

  /**
   * Create a provider key for caching
   * @private
   */
  private getProviderKey(chainInfo: ChainInfo): string {
    return `${chainInfo.chainId.chain}_${chainInfo.chainId.network}`;
  }

  /**
   * Create a new provider instance
   * @private
   */
  private createProvider(chainInfo: ChainInfo, key: string): JsonRpcProvider | WebSocketProvider {
    if (chainInfo.rpc?.webSocket) {
      const provider = new WebSocketProvider(chainInfo.rpc.webSocket);
      this.setupWebSocketHandlers(provider, key);
      this.setupWebSocketPing(provider, key);
      return provider;
    } else if (chainInfo.rpc?.primary) {
      return new JsonRpcProvider(chainInfo.rpc.primary);
    } else {
      throw new NetworkError(HibitIdSdkErrorCode.NETWORK_UNAVAILABLE, 'No RPC endpoint configured for chain');
    }
  }

  /**
   * Set up WebSocket event handlers
   * @private
   */
  private setupWebSocketHandlers(provider: WebSocketProvider, key: string): void {
    provider.on('error', (error: Error) => {
      this.logger.error(`WebSocket error for ${key}`, {
        error,
        context: 'ConnectionManager.setupWebSocketHandlers'
      });
      this.handleWebSocketReconnect(key);
    });

    provider.on('network', (_network, oldNetwork) => {
      if (oldNetwork) {
        this.logger.info(`Network changed for ${key}`, {
          context: 'ConnectionManager.setupWebSocketHandlers'
        });
      }
    });
  }

  /**
   * Set up WebSocket ping to keep connection alive
   * @private
   */
  private setupWebSocketPing(provider: WebSocketProvider, key: string): void {
    const pingInterval = setInterval(() => {
      const currentProvider = this.providerCache.get(key);
      if (currentProvider === provider) {
        provider.getBlockNumber().catch((error) => {
          this.logger.debug('WebSocket ping failed', {
            context: 'ConnectionManager.setupWebSocketPing',
            data: {
              key,
              error: error.message
            }
          });
        });
      } else {
        // Provider was evicted, clear the interval
        clearInterval(pingInterval);
      }
    }, ETHEREUM_NETWORK.WEBSOCKET.pingInterval);

    // Store interval reference for cleanup
    (provider as any)._pingInterval = pingInterval;
  }

  /**
   * Handle WebSocket reconnection with exponential backoff
   * @private
   */
  private async handleWebSocketReconnect(key: string): Promise<void> {
    const attempts = this.reconnectAttempts[key] || 0;

    if (attempts >= ETHEREUM_NETWORK.WEBSOCKET.maxReconnectAttempts) {
      this.logger.error(
        `Max reconnection attempts reached for ${key}`,
        {
          error: new Error('Max reconnection attempts reached'),
          context: 'ConnectionManager.handleWebSocketReconnect'
        }
      );
      this.providerCache.delete(key);
      delete this.reconnectAttempts[key];
      return;
    }

    const delay = ETHEREUM_NETWORK.WEBSOCKET.initialReconnectDelay * Math.pow(2, attempts);
    this.reconnectAttempts[key] = attempts + 1;

    this.logger.warn(
      `Reconnecting WebSocket for ${key}, attempt ${attempts + 1}/${ETHEREUM_NETWORK.WEBSOCKET.maxReconnectAttempts}`,
      {
        context: 'ConnectionManager.handleWebSocketReconnect'
      }
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      // Clean up old provider
      this.providerCache.delete(key);

      // Recreate provider
      this.getProvider(this.chainInfo);
      this.reconnectAttempts[key] = 0; // Reset counter on successful reconnection

      this.logger.info(`WebSocket reconnection successful for ${key}`, {
        context: 'ConnectionManager.handleWebSocketReconnect'
      });
    } catch (error) {
      this.logger.error(
        `WebSocket reconnection failed for ${key}`,
        {
          error: error instanceof Error ? error : new Error(String(error)),
          context: 'ConnectionManager.handleWebSocketReconnect'
        }
      );
    }
  }

  /**
   * Dispose of a provider instance
   * @private
   */
  private disposeProvider(provider: JsonRpcProvider | WebSocketProvider): void {
    if (provider instanceof WebSocketProvider) {
      const providerWithInterval = provider as any;
      if (providerWithInterval._pingInterval) {
        clearInterval(providerWithInterval._pingInterval);
        delete providerWithInterval._pingInterval;
      }

      try {
        const ws = (provider as any).websocket;
        if (ws && ws.readyState === ws.OPEN) {
          provider.destroy();
        }
      } catch (error) {
        this.logger.debug('Error disposing WebSocket provider', {
          context: 'ConnectionManager.disposeProvider',
          data: {
            error: String(error)
          }
        });
      }
    }
  }
}
