import TronWebDefault from 'tronweb';
const { TronWeb } = TronWebDefault;
import { ChainInfo, NetworkError, HibitIdSdkErrorCode, ILogger } from '@delandlabs/coin-base';
import { CHAIN_CONFIG } from '../config';

/**
 * Wallet information interface
 */
export interface TronWalletInfo {
  address: string;
  privateKey: string;
  publicKey: Uint8Array;
}

/**
 * Manages TronWeb connection and wallet information for TRON blockchain operations.
 *
 * This class centralizes connection management and provides a single point of access
 * to TronWeb instance and wallet information for all asset handlers.
 */
export class ConnectionManager {
  private tronWeb: InstanceType<typeof TronWeb> | null = null;
  private walletInfo: TronWalletInfo | null = null;
  private readonly chainInfo: ChainInfo;
  private readonly logger: ILogger;

  constructor(chainInfo: ChainInfo, logger: ILogger) {
    this.chainInfo = chainInfo;
    this.logger = logger;
  }

  /**
   * Initialize the connection manager with TronWeb and wallet information
   */
  initialize(walletInfo: TronWalletInfo): void {
    // Initialize TronWeb
    const endpoint = this.getEndpoint();
    this.tronWeb = new TronWeb({
      fullHost: endpoint
    });

    // Set the private key in TronWeb
    this.tronWeb.setPrivateKey(walletInfo.privateKey);

    // Store wallet information
    this.walletInfo = walletInfo;

    this.logger.debug('Connection manager initialized', {
      context: 'ConnectionManager.initialize',
      data: {
        endpoint,
        address: walletInfo.address
      }
    });
  }

  /**
   * Get the TronWeb instance
   */
  getTronWeb(): InstanceType<typeof TronWeb> {
    if (!this.tronWeb) {
      throw new NetworkError(
        HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
        `${CHAIN_CONFIG.CHAIN_NAME}: TronWeb not initialized`
      );
    }
    return this.tronWeb;
  }

  /**
   * Get wallet information
   */
  getWallet(): TronWalletInfo {
    if (!this.walletInfo) {
      throw new NetworkError(
        HibitIdSdkErrorCode.INVALID_CONFIGURATION,
        `${CHAIN_CONFIG.CHAIN_NAME}: Wallet not initialized`
      );
    }
    return this.walletInfo;
  }

  /**
   * Check if the connection manager is initialized
   */
  isInitialized(): boolean {
    return this.tronWeb !== null && this.walletInfo !== null;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.tronWeb = null;
    this.walletInfo = null;

    this.logger.debug('Connection manager cleaned up', {
      context: 'ConnectionManager.cleanup'
    });
  }

  /**
   * Get the endpoint URL from chain configuration
   */
  private getEndpoint(): string {
    // Use RPC URL from chainInfo
    if (this.chainInfo.rpc && this.chainInfo.rpc.primary && this.chainInfo.rpc.primary.trim() !== '') {
      return this.chainInfo.rpc.primary;
    }

    // Require RPC URL instead of using hardcoded fallback
    throw new NetworkError(
      HibitIdSdkErrorCode.INVALID_CONFIGURATION,
      `${CHAIN_CONFIG.CHAIN_NAME}: RPC URL must be provided in chainInfo.rpc.primary`
    );
  }
}
