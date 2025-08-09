import BigNumber from 'bignumber.js';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { LRUCache } from 'lru-cache';
import { BaseAssetHandler } from './base-asset-handler';
import {
  BalanceQueryParams,
  TransferParams,
  BalanceQueryError,
  TransactionError,
  HibitIdSdkErrorCode,
  ILogger,
  NetworkError,
  Memoize
} from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { isValidIcrcAddress } from '../utils';
import { CHAIN_CONFIG, CACHE_CONFIG, DfinityRetry } from '../config';
import ic from 'ic0';
import { AgentManager } from '../shared/agent-manager';
import { IC_CANISTERS } from '../config';
import { IcrcMetadataResponseEntries } from '@dfinity/ledger-icrc';

/**
 * Asset handler for ICRC tokens (ICRC-1 standard fungible tokens).
 *
 * Handles balance queries, transfers, and fee estimation for ICRC tokens.
 * Only supports Principal address format (not AccountIdentifier).
 */
export class IcrcTokenHandler extends BaseAssetHandler {
  private ledgerCache: LRUCache<string, IcrcLedgerCanister>;

  constructor(agentManager: AgentManager, logger: ILogger) {
    super(agentManager, logger);
    // Initialize LRU cache with configured size and TTL
    this.ledgerCache = new LRUCache<string, IcrcLedgerCanister>({
      max: CACHE_CONFIG.SIZE.LEDGER,
      ttl: CACHE_CONFIG.TTL.LEDGER
    });
  }

  /**
   * Get or create an ICRC Ledger instance for the specified canister (for transactions)
   * @param canisterId - The canister ID for the ICRC token
   * @returns The IcrcLedgerCanister instance
   */
  private getIcrcLedger(canisterId: string): IcrcLedgerCanister {
    if (!this.ledgerCache.has(canisterId)) {
      const agent = this.agentManager.getAgent();
      const ledger = IcrcLedgerCanister.create({
        agent,
        canisterId: Principal.fromText(canisterId)
      });
      this.ledgerCache.set(canisterId, ledger);
      this.logger.debug(`ICRC Ledger instance created for ${canisterId}`, {
        context: 'IcrcTokenHandler.getIcrcLedger'
      });
    }
    return this.ledgerCache.get(canisterId)!;
  }

  /**
   * Get an ICRC Ledger instance for queries using anonymous agent
   * @param canisterId - The canister ID for the ICRC token
   * @returns The IcrcLedgerCanister instance for queries
   */
  private getIcrcLedgerForQuery(canisterId: string): IcrcLedgerCanister {
    const agent = this.agentManager.getAnonymousAgent();
    // Create a new instance each time since anonymous agents are stateless
    return IcrcLedgerCanister.create({
      agent,
      canisterId: Principal.fromText(canisterId)
    });
  }

  public getAssetType(): ChainAssetType {
    return ChainAssetType.ICRC3;
  }

  /**
   * Query ICRC token balance in smallest unit
   * Note: Address and token validation is handled at wallet level
   */
  public async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const { address, token } = params;

    // Token address validation is handled at wallet level

    // Address validation is handled at wallet level

    // Dfinity-specific check: ICRC tokens only support Principal format, not AccountIdentifier
    if (!isValidIcrcAddress(address)) {
      throw new BalanceQueryError(
        HibitIdSdkErrorCode.INVALID_RECIPIENT_ADDRESS,
        `${CHAIN_CONFIG.CHAIN_NAME}: ICRC tokens only support Principal addresses, not AccountIdentifier format`
      );
    }

    // Check ICRC-3 support first
    await this.assertIcrc3Support(token.tokenAddress!);

    const ledger = this.getIcrcLedgerForQuery(token.tokenAddress!);
    const principal = Principal.fromText(address);

    const balance = await ledger.balance({
      owner: principal
    });

    // Return balance in smallest unit (no conversion)
    const result = new BigNumber(String(balance));

    this.logger.debug(
      `ICRC token balance retrieved: ${result.toString()} (smallest unit)`,
      {
        context: 'IcrcTokenHandler.balanceOf',
        data: {
          address,
          tokenAddress: token.tokenAddress,
          balance: balance.toString()
        }
      }
    );

    return result;
  }

  public async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount, token } = params;

    // Token address validation is handled at wallet level

    // Address, amount and token validation is handled at wallet level

    // Dfinity-specific check: ICRC tokens only support Principal format, not AccountIdentifier
    if (!isValidIcrcAddress(recipientAddress)) {
      throw new TransactionError(
        HibitIdSdkErrorCode.INVALID_RECIPIENT_ADDRESS,
        `${CHAIN_CONFIG.CHAIN_NAME}: ICRC tokens only support Principal addresses, not AccountIdentifier format`
      );
    }

    await this.assertIcrc3Support(token.tokenAddress!);

    const ledger = this.getIcrcLedger(token.tokenAddress!);
    const toPrincipal = Principal.fromText(recipientAddress);

    // Amount is already in smallest unit
    const amountInSmallestUnit = BigInt(amount.integerValue(BigNumber.ROUND_FLOOR).toString());

    this.logger.debug(`Initiating ICRC token transfer`, {
      context: 'IcrcTokenHandler.transfer',
      data: {
        recipientAddress,
        tokenAddress: token.tokenAddress,
        amountSmallestUnit: amountInSmallestUnit.toString()
      }
    });

    const blockIndex = await ledger.transfer({
      to: {
        owner: toPrincipal,
        subaccount: []
      },
      amount: amountInSmallestUnit
    });

    const transactionId = String(blockIndex);

    this.logger.info(`ICRC token transfer completed successfully`, {
      context: 'IcrcTokenHandler.transfer',
      data: {
        recipientAddress,
        tokenAddress: token.tokenAddress,
        amountSmallestUnit: amountInSmallestUnit.toString(),
        blockIndex: transactionId
      }
    });

    return transactionId;
  }

  public async estimateFee(params: TransferParams): Promise<BigNumber> {
    const { token } = params;

    // Token address validation is handled at wallet level

    // Note: Address, amount and token validation is handled at wallet level
    const canisterId = Principal.fromText(token.tokenAddress!);
    const fee = await this.fetchTransferFee(canisterId);

    // Return fee in smallest unit
    const result = new BigNumber(String(fee));

    this.logger.debug(
      `ICRC token fee estimated: ${result.toString()} (smallest unit)`,
      {
        context: 'IcrcTokenHandler.estimateFee',
        data: { tokenAddress: token.tokenAddress }
      }
    );

    return result;
  }

  /**
   * Assert that the token supports ICRC-3 standard
   * @param tokenAddress - The token canister ID to check
   * @throws TransactionError if the token doesn't support ICRC-3
   */
  private async assertIcrc3Support(tokenAddress: string): Promise<void> {
    const supportsIcrc3 = await this.checkIcrc3Support(tokenAddress);

    if (!supportsIcrc3) {
      throw new TransactionError(
        HibitIdSdkErrorCode.TRANSACTION_BROADCAST_FAILED,
        `${CHAIN_CONFIG.CHAIN_NAME}: Token ${tokenAddress} does not support ICRC-3 standard`
      );
    }
  }

  public cleanup(): void {
    this.ledgerCache.clear();
    this.logger.debug('ICRC token handler resources cleaned up', {
      context: 'IcrcTokenHandler.cleanup'
    });
  }

  /**
   * Get a cached ICRC ledger for queries (accessible by wallet)
   * @param tokenAddress - Token canister address
   * @returns The IcrcLedgerCanister instance or undefined if not cached
   * @protected
   */
  protected getIcrcLedgerForQueries(tokenAddress: string): IcrcLedgerCanister | undefined {
    return this.ledgerCache.get(tokenAddress);
  }

  /**
   * Get all cached ICRC ledgers (accessible by wallet)
   * @returns LRUCache of all cached ledger instances
   * @protected
   */
  protected getAllCachedLedgers(): LRUCache<string, IcrcLedgerCanister> {
    return this.ledgerCache;
  }

  /**
   * Get decimals for ICRC token
   * @param tokenAddress - The token canister ID
   * @returns Promise resolving to the number of decimals
   */
  async getDecimals(tokenAddress?: string): Promise<number> {
    // Validation is handled at wallet level
    const canisterId = Principal.fromText(tokenAddress!);
    return await this.fetchDecimals(canisterId);
  }

  /**
   * Fetch decimals for a token with caching and retry
   */
  @DfinityRetry({})
  @Memoize({
    ttl: CACHE_CONFIG.TTL.DECIMALS,
    max: CACHE_CONFIG.SIZE.DECIMALS,
    key: (canisterId: Principal) => `decimals:${canisterId.toString()}`
  })
  private async fetchDecimals(canisterId: Principal): Promise<number> {
    const canisterIdString = canisterId.toString();

    // Handle ICP ledger specially - it doesn't implement the decimals() method
    // ICP always has 8 decimals as per the IC specification
    if (canisterIdString === IC_CANISTERS.ICP_LEDGER) {
      return 8;
    }

    // For ICRC tokens, query the metadata
    const ledger = IcrcLedgerCanister.create({
      agent: this.agentManager.getAnonymousAgent(),
      canisterId
    });

    const metadata = await ledger.metadata({});

    // Extract decimals from metadata entries
    for (const entry of metadata) {
      if (entry[0] === IcrcMetadataResponseEntries.DECIMALS) {
        const decimals = Number(String((entry[1] as { Nat: bigint }).Nat));
        this.logger.debug(`Fetched decimals for ${canisterIdString}: ${decimals}`, {
          context: 'IcrcTokenHandler.fetchDecimals'
        });
        return decimals;
      }
    }

    throw new NetworkError(
      HibitIdSdkErrorCode.NETWORK_UNAVAILABLE,
      `Decimals not found in metadata for token ${canisterIdString}`
    );
  }

  /**
   * Fetch transfer fee for a token with caching
   */
  @DfinityRetry({})
  @Memoize({
    ttl: CACHE_CONFIG.TTL.FEE,
    max: CACHE_CONFIG.SIZE.FEE,
    key: (canisterId: Principal) => `fee:${canisterId.toString()}`
  })
  private async fetchTransferFee(canisterId: Principal): Promise<bigint> {
    const ledger = this.getIcrcLedgerForQuery(canisterId.toString());
    return await ledger.transactionFee({});
  }

  /**
   * Check ICRC-3 support with caching and retry
   */
  @DfinityRetry({})
  @Memoize({
    ttl: CACHE_CONFIG.TTL.ICRC3_SUPPORT,
    max: CACHE_CONFIG.SIZE.ICRC3_SUPPORT,
    key: (tokenAddress: string) => `icrc3:${tokenAddress}`
  })
  private async checkIcrc3Support(tokenAddress: string): Promise<boolean> {
    const ledger = ic(tokenAddress);
    const response = (await ledger.call('icrc1_supported_standards')) as Array<{
      name: string;
      url: string;
    }>;

    this.logger.debug('icrc1_supported_standards', {
      context: 'IcrcTokenHandler.checkIcrc3Support',
      data: {
        tokenAddress,
        supportedStandards: response?.map((s) => s?.name).filter(Boolean) || []
      }
    });

    return Array.isArray(response) && response.some((standard) => standard?.name.toUpperCase() === 'ICRC-3');
  }
}
