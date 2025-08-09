import { ChainValidation, ChainValidator } from '@delandlabs/coin-base';
import { ChainType } from '@delandlabs/hibit-basic-types';

// Register Solana address validator for tests
class MockSolanaValidator implements ChainValidator {
  validateWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;

    // Simple validation for Solana addresses
    // Base58 characters only, length between 32-44 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  }

  validateTokenAddress(tokenAddress: string): boolean {
    // SPL tokens use same address format as wallets
    return this.validateWalletAddress(tokenAddress);
  }
}

ChainValidation.register(ChainType.Solana, new MockSolanaValidator());
