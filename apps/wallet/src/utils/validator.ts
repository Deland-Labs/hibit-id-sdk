import TonWeb from 'tonweb';
import { Chain } from './basicTypes';
import { isAddressPrincipal } from './chain/chain-wallets/dfinity/utils';
import hibitIdSession from '../stores/session';

export const walletAddressValidate = (chainType: Chain, address: string) => {
  if (!chainType || !address) {
    return false;
  }
  if (chainType.equals(Chain.Bitcoin)) {
    const r1 = /^(tb1|bc1)[a-zA-Z0-9]{39}$/i.test(address) // Native Segwit
    const r2 = /^(tb1|bc1)[a-zA-Z0-9]{59}$/i.test(address) // Taproot
    const r3 = /^[a-zA-Z0-9]{35}$/i.test(address) // Legacy
    const r4 = /^[a-zA-Z0-9]{34}$/i.test(address); // Nested Segwit
    return r1 || r2 || r3 || r4
    // return bitcore.Address.isValid(address);
  } else if (chainType.equals(Chain.Ethereum)) {
    return /^0x[a-fA-F0-9]{40}$/i.test(address);
  } else if (chainType.equals(Chain.Tron)) {
    return /^[a-zA-Z0-9]{34}$/.test(address);
  } else if (chainType.equals(Chain.Solana)) {
    return /^[a-zA-Z0-9]{44}$/.test(address);
  } else if (chainType.equals(Chain.Ton)) {
    try {
      const addr = new TonWeb.utils.Address(address).toString(false)
      return !!addr
    } catch (e) {
      return false
    }
    // return /^[a-zA-Z0-9-_]{48}$/.test(address);
  } else if (chainType.equals(Chain.Dfinity)) {
    return isAddressPrincipal(address)
  } else if (chainType.equals(Chain.Kaspa)) {
    return !hibitIdSession.config.devMode
      ? /^kaspa:[a-zA-Z0-9]{61}$/.test(address)
      : /^kaspatest:[a-zA-Z0-9]{61}$/.test(address);
  }
  // TODO: add more rules when supporting new chains
  return false;
};
