export * from './chain-wallet';

// Register Ethereum validator
import { ChainValidation } from '@delandlabs/coin-base';
import { ChainType } from '@delandlabs/hibit-basic-types';
import { EthereumValidator } from './chain-wallet/validator';

// Register for Ethereum (other EVM chains would be registered separately if needed)
ChainValidation.register(ChainType.Ethereum, new EthereumValidator());
