export * from './chain-wallet';

// Register TRON validator
import { ChainType } from '@delandlabs/hibit-basic-types';
import { ChainValidation } from '@delandlabs/coin-base';
import { TronValidator } from './chain-wallet/validator';

ChainValidation.register(ChainType.Tron, new TronValidator());
