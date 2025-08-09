export * from './chain-wallet';

// Register Kaspa validator
import { ChainType } from '@delandlabs/hibit-basic-types';
import { ChainValidation } from '@delandlabs/coin-base';
import { KaspaValidator } from './chain-wallet/validator';

ChainValidation.register(ChainType.Kaspa, new KaspaValidator());
