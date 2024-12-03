import { validateU64 } from 'src/lib/validator.ts';

/**
 * Represents the fees associated with a transaction.
 */
class Fees {
  /**
   * The amount of the fee
   * @remarks this is a 64-bit unsigned integer.
   */
  amount: bigint;

  /**
   * The source of the fee, which can be optional.
   */
  source: FeeSource;

  /**
   * Creates an instance of Fees.
   * @param amount - The amount of the fee in u64 format.
   * @param source - The source of the fee.
   */
  constructor(amount: bigint, source?: FeeSource) {
    validateU64(amount, 'amount');

    this.amount = amount;
    this.source = source ?? FeeSource.SenderPays;
  }
}

/**
 * Enum representing the source of the fees.
 */
enum FeeSource {
  SenderPays,
  ReceiverPays
}

export { Fees, FeeSource };
