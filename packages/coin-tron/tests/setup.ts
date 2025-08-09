import { ChainValidation, ChainValidator } from '@delandlabs/coin-base';
import { ChainType } from '@delandlabs/hibit-basic-types';

// Register Tron address validator for tests
class MockTronValidator implements ChainValidator {
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;

    // Basic TRON address validation
    // Starts with 'T' and is 34 characters long
    const tronAddressRegex = /^T[a-zA-Z0-9]{33}$/;
    return tronAddressRegex.test(address);
  }

  validateTokenAddress(tokenAddress: string): boolean {
    // TRC20 tokens use same address format as wallets
    return this.validateWalletAddress(tokenAddress);
  }
}

ChainValidation.register(ChainType.Tron, new MockTronValidator());
