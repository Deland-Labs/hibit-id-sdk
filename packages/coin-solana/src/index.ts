export * from './chain-wallet';

// Register Solana validator
import { ChainValidation } from '@delandlabs/coin-base';
import { ChainType } from '@delandlabs/hibit-basic-types';
import { SolanaValidator } from './chain-wallet/validator';

// Register for Solana
ChainValidation.register(ChainType.Solana, new SolanaValidator());
