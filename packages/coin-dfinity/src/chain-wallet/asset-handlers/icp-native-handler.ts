import BigNumber from 'bignumber.js';
import { LedgerCanister } from '@dfinity/ledger-icp';
import { Principal } from '@dfinity/principal';
import { BaseAssetHandler } from './base-asset-handler';
import { BalanceQueryParams, TransferParams, Memoize } from '@delandlabs/coin-base';
import { ChainAssetType } from '@delandlabs/hibit-basic-types';
import { addressToAccountIdentifier } from '../utils';
import { IC_CANISTERS, CACHE_CONFIG, DfinityRetry } from '../config';

const ICP_LEDGER_CANISTER_ID = Principal.fromText(IC_CANISTERS.ICP_LEDGER);

/**
 * Asset handler for Native ICP tokens.
 *
 * Handles balance queries, transfers, and fee estimation for the native ICP token.
 * Supports both Principal and AccountIdentifier address formats.
 */
export class IcpNativeHandler extends BaseAssetHandler {
  private ledger?: LedgerCanister;

  /**
   * Get or create the ICP Ledger instance for transactions
   * @returns The LedgerCanister instance for ICP operations
   */
  private getIcpLedger(): LedgerCanister {
    if (!this.ledger) {
      const agent = this.agentManager.getAgent();
      this.ledger = LedgerCanister.create({
        agent,
        canisterId: ICP_LEDGER_CANISTER_ID
      });
      this.logger.debug('ICP Ledger instance created', {
        context: 'IcpNativeHandler.getIcpLedger'
      });
    }
    return this.ledger;
  }

  /**
   * Get or create an ICP Ledger instance for queries using anonymous agent
   * @returns The LedgerCanister instance for ICP query operations
   */
  private getIcpLedgerForQuery(): LedgerCanister {
    const agent = this.agentManager.getAnonymousAgent();
    // Create a new instance each time since anonymous agents are stateless
    return LedgerCanister.create({
      agent,
      canisterId: ICP_LEDGER_CANISTER_ID
    });
  }

  public getAssetType(): ChainAssetType {
    return ChainAssetType.ICP;
  }

  /**
   * Query ICP native balance in e8s (smallest unit)
   * Note: Address validation is handled at wallet level
   */
  public async balanceOf(params: BalanceQueryParams): Promise<BigNumber> {
    const { address } = params;

    // Address validation is handled at wallet level
    // ICP native supports both Principal and AccountIdentifier formats

    const ledger = this.getIcpLedgerForQuery();
    const accountId = addressToAccountIdentifier(address);

    const balance = await ledger.accountBalance({
      accountIdentifier: accountId
    });

    // Return balance in e8s (smallest unit)
    const result = new BigNumber(String(balance));

    this.logger.debug(`ICP native balance retrieved: ${result.toString()} e8s`, {
      context: 'IcpNativeHandler.balanceOf',
      data: {
        address,
        balance: balance.toString()
      }
    });

    return result;
  }

  public async transfer(params: TransferParams): Promise<string> {
    const { recipientAddress, amount } = params;

    // Address, amount and token validation is handled at wallet level
    // ICP native supports both Principal and AccountIdentifier formats
    // Amount is expected in e8s (smallest unit)

    const ledger = this.getIcpLedger();
    const toAccountId = addressToAccountIdentifier(recipientAddress);
    const amountInE8s = BigInt(amount.integerValue(BigNumber.ROUND_FLOOR).toString());

    this.logger.debug(`Initiating ICP native transfer`, {
      context: 'IcpNativeHandler.transfer',
      data: {
        recipientAddress,
        amountE8s: amountInE8s.toString()
      }
    });

    const blockHeight = await ledger.transfer({
      to: toAccountId,
      amount: amountInE8s
    });

    const transactionId = String(blockHeight);

    this.logger.info(`ICP native transfer completed successfully`, {
      context: 'IcpNativeHandler.transfer',
      data: {
        recipientAddress,
        amountE8s: amountInE8s.toString(),
        blockHeight: transactionId
      }
    });

    return transactionId;
  }

  public async estimateFee(_params: TransferParams): Promise<BigNumber> {
    // Note: Address, amount and token validation is handled at wallet level
    const fee = await this.fetchIcpTransferFee();

    // Return fee in e8s (smallest unit)
    const result = new BigNumber(String(fee));

    this.logger.debug(`ICP native fee estimated: ${result.toString()} e8s`, {
      context: 'IcpNativeHandler.estimateFee'
    });

    return result;
  }

  public cleanup(): void {
    this.ledger = undefined;
    this.logger.debug('ICP native handler resources cleaned up', {
      context: 'IcpNativeHandler.cleanup'
    });
  }

  /**
   * Get ICP Ledger instance for queries (accessible by wallet)
   * @returns The LedgerCanister instance for query operations
   * @protected
   */
  protected getIcpLedgerForQueries(): LedgerCanister {
    return this.getIcpLedgerForQuery();
  }

  /**
   * Get decimals for ICP token
   * @returns Promise resolving to the number of decimals (always 8 for ICP)
   */
  async getDecimals(): Promise<number> {
    return await this.fetchIcpDecimals();
  }

  /**
   * Fetch decimals for ICP with caching and retry
   */
  @DfinityRetry({})
  @Memoize({
    ttl: CACHE_CONFIG.TTL.DECIMALS,
    max: 1, // ICP only has one value
    key: () => 'decimals:icp'
  })
  private async fetchIcpDecimals(): Promise<number> {
    // ICP uses fixed 8 decimals, but we fetch it dynamically for consistency
    // Note: ICP Ledger doesn't have a decimals() method like ICRC tokens
    // The standard is 8 decimals (1 ICP = 10^8 e8s)
    return 8;
  }

  /**
   * Fetch transfer fee for ICP with caching
   */
  @DfinityRetry({})
  @Memoize({
    ttl: CACHE_CONFIG.TTL.FEE,
    max: 1, // ICP only has one fee
    key: () => 'fee:icp'
  })
  private async fetchIcpTransferFee(): Promise<bigint> {
    const ledger = this.getIcpLedgerForQuery();
    return await ledger.transactionFee();
  }
}
