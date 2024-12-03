import { Address } from 'src/lib/address';

class PaymentOutput {
  /**
   * Destination address. The address prefix must match the network
   * you are transacting on (e.g. `kaspa:` for mainnet, `kaspatest:` for testnet, etc).
   */
  address: Address;

  /**
   * Output amount in SOMPI.
   */
  amount: bigint;

  constructor(address: Address | string, amount: bigint) {
    this.address = Address.fromString(address.toString());
    this.amount = amount;
  }
}

export { PaymentOutput };
