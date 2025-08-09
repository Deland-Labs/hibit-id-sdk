import 'reflect-metadata';
import { describe, expect, test, vi } from 'vitest';
import { BaseChainWallet } from '../src/base-chain-wallet';
import { ChainInfo } from '../src/types/chain';
import { ChainAccount, ChainId, ChainNetwork, ChainType, WalletSignatureSchema } from '@delandlabs/hibit-basic-types';
import BigNumber from 'bignumber.js';
import { cleanupReferences } from '../src/utils/wallet-utils';

// Mock chain info
const mockChainInfo: ChainInfo = {
  chainId: new ChainId(ChainType.Ethereum, ChainNetwork.EthereumMainNet),
  name: 'Ethereum',
  fullName: 'Ethereum Mainnet',
  icon: 'eth.png',
  nativeAssetSymbol: 'ETH',
  supportedSignaturesSchemas: [WalletSignatureSchema.EvmEcdsa],
  explorer: 'https://etherscan.io',
  rpc: { primary: 'https://eth.llamarpc.com' },
  isMainnet: true,
  isNativeGas: true,
  ecosystem: 'EVM' as any
};

// Test wallet implementation
class TestWallet extends BaseChainWallet {
  public connection: any = { url: 'test' };
  public client: any = { endpoint: 'test' };
  public privateData: any = { key: 'secret' };
  public eventHandlers: Map<string, Function> = new Map();
  public intervalId: NodeJS.Timeout | null = null;

  constructor(mnemonic: string) {
    super({ chainInfo: mockChainInfo }, mnemonic);

    // Simulate some resource allocation
    this.eventHandlers.set('test', () => console.log('test'));
    this.intervalId = setInterval(() => {}, 1000);
  }

  public isValidAddress(address: string): boolean {
    return address.length > 0;
  }

  protected async getAccountImpl(): Promise<ChainAccount> {
    return new ChainAccount(this.chainInfo.chainId, '0x1234567890123456789012345678901234567890', 'abcdef0123456789');
  }

  protected async signMessageImpl(): Promise<Uint8Array> {
    return new Uint8Array([1, 2, 3]);
  }

  protected async balanceOfImpl(): Promise<BigNumber> {
    return new BigNumber(0);
  }

  protected async transferImpl(): Promise<string> {
    return '0xhash';
  }

  protected async estimateFeeImpl(): Promise<BigNumber> {
    return new BigNumber(0.001);
  }

  protected async waitForConfirmationImpl(_params: any): Promise<any> {
    return {
      isConfirmed: true,
      confirmations: 1,
      requiredConfirmations: 1,
      status: 'confirmed'
    };
  }

  protected destroyImpl(): void {
    // Clean up resources
    cleanupReferences(this, ['connection', 'client', 'privateData']);

    // Clear event handlers
    this.eventHandlers.clear();

    // Clear interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  protected async getAssetDecimalsImpl(_token: any): Promise<number> {
    return 8; // Mock decimal places
  }
}

describe('Memory Management Tests', () => {
  const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  test('should properly clean up resources on destroy', async () => {
    const wallet = new TestWallet(validMnemonic);

    // Verify resources are allocated
    expect(wallet.connection).toBeDefined();
    expect(wallet.client).toBeDefined();
    expect(wallet.privateData).toBeDefined();
    expect(wallet.eventHandlers.size).toBe(1);
    expect(wallet.intervalId).toBeDefined();

    // Destroy wallet
    wallet.destroy();

    // Verify resources are cleaned up
    expect(wallet.connection).toBeNull();
    expect(wallet.client).toBeNull();
    expect(wallet.privateData).toBeNull();
    expect(wallet.eventHandlers.size).toBe(0);
    expect(wallet.intervalId).toBeNull();
  });

  test('cleanupReferences utility should nullify specified properties', () => {
    const obj = {
      prop1: 'value1',
      prop2: { nested: 'value' },
      prop3: [1, 2, 3],
      prop4: 'keep this'
    };

    cleanupReferences(obj, ['prop1', 'prop2', 'prop3']);

    expect(obj.prop1).toBeNull();
    expect(obj.prop2).toBeNull();
    expect(obj.prop3).toBeNull();
    expect(obj.prop4).toBe('keep this');
  });

  test('should not throw when cleaning up non-existent properties', () => {
    const obj = { existing: 'value' };

    expect(() => {
      cleanupReferences(obj, ['nonExistent', 'alsoNotThere']);
    }).not.toThrow();

    expect(obj.existing).toBe('value');
  });

  test('multiple destroy calls should be safe', async () => {
    const wallet = new TestWallet(validMnemonic);

    // First destroy
    wallet.destroy();
    expect(wallet.connection).toBeNull();

    // Second destroy should not throw
    expect(() => wallet.destroy()).not.toThrow();
  });

  test('should handle cleanup errors gracefully', async () => {
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis()
    };

    class ErrorWallet extends TestWallet {
      constructor(mnemonic: string) {
        super(mnemonic);
        // Replace logger with mock
        (this as any).logger = mockLogger;
      }

      protected destroyImpl(): void {
        throw new Error('Cleanup failed');
      }

      protected async waitForConfirmationImpl(params: any): Promise<any> {
        return super.waitForConfirmationImpl(params);
      }
    }

    const wallet = new ErrorWallet(validMnemonic);

    // Should not throw even if destroyImpl throws
    expect(() => wallet.destroy()).not.toThrow();

    // Should log the error
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error cleaning up BaseChainWallet resources',
      {
        error: expect.any(Error),
        context: 'BaseChainWallet.destroy'
      }
    );
  });

  test('wallet should remain functional until destroyed', async () => {
    const wallet = new TestWallet(validMnemonic);

    // Wallet should be functional before destroy
    const account = await wallet.getAccount();
    expect(account).toBeDefined();
    expect(account.address).toBe('0x1234567890123456789012345678901234567890');

    // Resources should be available
    expect(wallet.connection).toBeDefined();
    expect(wallet.client).toBeDefined();

    // After destroy, resources should be cleaned
    wallet.destroy();
    expect(wallet.connection).toBeNull();
    expect(wallet.client).toBeNull();
  });
});
