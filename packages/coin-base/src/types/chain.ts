import { Transform, Type } from 'class-transformer';
import { ChainId, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';

export enum Ecosystem {
  EVM = 'EVM',
  Bitcoin = 'Bitcoin',
  Solana = 'Solana',
  Tron = 'Tron',
  Ton = 'Ton',
  ICP = 'ICP',
  Kaspa = 'Kaspa'
}

/**
 * RPC configuration for blockchain connections
 */
export interface RpcConfiguration {
  /** Primary RPC endpoint */
  primary: string;
  /** Fallback RPC endpoints for redundancy (optional) */
  fallbacks?: string[];
  /** WebSocket RPC endpoint for real-time connections (optional) */
  webSocket?: string;
}

export class ChainInfo {
  /**
   * Chain id
   * @type {ChainId} https://github.com/satoshilabs/slips/blob/master/slip-0044.md.
   */
  @Type(() => ChainId)
  @Transform(
    ({ value }) => {
      if (!value) return value;
      return ChainId.fromString(`${value.type.value}_${value.network.value}`);
    },
    {
      toClassOnly: true
    }
  )
  chainId!: ChainId;
  name!: string;
  fullName!: string;
  icon!: string;
  nativeAssetSymbol!: string;
  supportedSignaturesSchemas!: WalletSignatureSchema[];
  explorer!: string;

  /** RPC configuration */
  rpc!: RpcConfiguration;

  isMainnet!: boolean;
  isNativeGas!: boolean;
  ecosystem!: Ecosystem;

  // Optional fields for specific chains
  getTransactionLink?: (transactionId: string) => string;
  getAddressLink?: (address: string) => string;
}
