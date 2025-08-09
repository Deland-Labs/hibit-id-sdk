import 'reflect-metadata';
import { describe, expect, test, vi } from 'vitest';
import { TonMainNet, TonTestnet } from './test-chains';
import { Ecosystem } from '@delandlabs/coin-base';
import {
  TonMainNet as TonMainNetId,
  TonTestNet as TonTestNetId,
  WalletSignatureSchema
} from '@delandlabs/hibit-basic-types';
import { base } from '@delandlabs/crypto-lib';
import { Address } from '@ton/core';

// Mock @ton/core Address
vi.mock('@ton/core', () => ({
  Address: {
    parse: vi.fn().mockImplementation((addr) => ({
      toString: vi.fn((options) => {
        if (!options) return 'raw_address_format';
        const { bounceable, testOnly } = options;
        if (bounceable) {
          return testOnly ? 'kQTestnetBounceable123' : 'EQBounceable123';
        }
        return 'UQNonBounceable123';
      }),
      toRawString: vi.fn(() => '0:' + addr.replace(/[^a-fA-F0-9]/g, '').padEnd(64, '0').slice(0, 64))
    }))
  }
}))

describe('TON Chain Configurations', () => {
  describe('Ton (Mainnet)', () => {
    test('should have correct configuration', () => {
      expect(TonMainNet.chainId).toBe(TonMainNetId);
      expect(TonMainNet.name).toBe('TON');
      expect(TonMainNet.isMainnet).toBe(true);
      expect(TonMainNet.ecosystem).toBe(Ecosystem.Ton);
      expect(TonMainNet.supportedSignaturesSchemas).toContain(WalletSignatureSchema.TonEddsaOpenMask);
      expect(typeof TonMainNet.getTransactionLink).toBe('function');
      expect(typeof TonMainNet.getAddressLink).toBe('function');
    });
  });

  describe('TonTestnet', () => {
    test('should have correct testnet configuration', () => {
      expect(TonTestnet.chainId).toBe(TonTestNetId);
      expect(TonTestnet.name).toBe('TON Testnet');
      expect(TonTestnet.isMainnet).toBe(false);
      expect(TonTestnet.explorer).toBe('https://testnet.tonviewer.com');
      expect(TonTestnet.ecosystem).toBe(TonMainNet.ecosystem);
    });
  });


  describe('Transaction Links', () => {
    test('TonMainNet.getTransactionLink should generate correct mainnet links', () => {
      const txId = 'dGVzdHRyYW5zYWN0aW9uaWQ='; // 'testtransactionid' in base64
      const link = TonMainNet.getTransactionLink!(txId);

      expect(link).toContain('https://tonviewer.com/transaction/');
      expect(link).toContain(base.toHex(base.fromBase64(txId)));
    });

    test('TonTestnet.getTransactionLink should generate correct testnet links', () => {
      const txId = 'dGVzdHRyYW5zYWN0aW9uaWQ='; // 'testtransactionid' in base64
      const link = TonTestnet.getTransactionLink!(txId);

      expect(link).toContain('https://testnet.tonviewer.com/transaction/');
      expect(link).toContain(base.toHex(base.fromBase64(txId)));
    });

    test('should handle empty transaction ID', () => {
      expect(TonMainNet.getTransactionLink!('')).toBe('');
      expect(TonMainNet.getTransactionLink!('   ')).toBe('');
      expect(TonTestnet.getTransactionLink!('')).toBe('');
    });

    test('should handle invalid base64 transaction ID', () => {
      const invalidTxId = 'invalid_base64_!!!';
      const link = TonMainNet.getTransactionLink!(invalidTxId);

      // Should still generate a link, possibly with the original ID
      expect(link).toContain('https://tonviewer.com/transaction/');
    });

    test('should convert base64 to hex correctly', () => {
      const testData = new TextEncoder().encode('test transaction id');
      const base64TxId = btoa(String.fromCharCode(...testData));
      const expectedHex = base.toHex(base.fromBase64(base64TxId));

      const link = TonMainNet.getTransactionLink!(base64TxId);
      expect(link).toContain(expectedHex);
    });
  });

  describe('Address Links', () => {
    test('TonMainNet.getAddressLink should generate correct mainnet links', () => {
      const address = 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t';
      const link = TonMainNet.getAddressLink!(address);

      expect(link).toContain('https://tonviewer.com/');
      expect(Address.parse).toHaveBeenCalledWith(address);
    });

    test('TonTestnet.getAddressLink should generate correct testnet links', () => {
      const address = 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t';
      const link = TonTestnet.getAddressLink!(address);

      expect(link).toContain('https://testnet.tonviewer.com/');
    });

    test('should handle empty address', () => {
      expect(TonMainNet.getAddressLink!('')).toBe('');
      expect(TonMainNet.getAddressLink!('   ')).toBe('');
      expect(TonTestnet.getAddressLink!('')).toBe('');
    });

    test('should handle invalid address gracefully', () => {
      (Address.parse as any).mockImplementationOnce(() => {
        throw new Error('Invalid address');
      });

      const invalidAddress = 'invalid_address';
      const link = TonMainNet.getAddressLink!(invalidAddress);

      expect(link).toBe(invalidAddress); // Should return original address as fallback
    });

    test('should generate bounceable address for links', () => {
      const address = 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t';

      const link = TonMainNet.getAddressLink!(address);

      // Verify the link was generated
      expect(link).toContain('https://tonviewer.com/');
      expect(link).not.toBe('');
    });
  });
});
