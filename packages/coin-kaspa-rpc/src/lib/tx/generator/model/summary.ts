import { TransactionId } from 'src/lib/tx/index.ts';
import { validateU64 } from 'src/lib/validator.ts';
import { NetworkId } from 'src/lib/consensus';

class GeneratorSummary {
  networkId: NetworkId;
  aggregatedUtxos: number;
  aggregatedFees: bigint;
  numberOfGeneratedTransactions: number;
  finalTransactionAmount?: bigint;
  finalTransactionId?: TransactionId;

  constructor(
    networkId: NetworkId,
    aggregatedUtxos: number,
    aggregatedFees: bigint,
    numberOfGeneratedTransactions: number,
    finalTransactionAmount?: bigint,
    finalTransactionId?: TransactionId
  ) {
    validateU64(aggregatedFees, 'aggregatedFees');
    if (finalTransactionAmount !== undefined) validateU64(finalTransactionAmount, 'finalTransactionAmount');

    this.networkId = networkId;
    this.aggregatedUtxos = aggregatedUtxos;
    this.aggregatedFees = aggregatedFees;
    this.numberOfGeneratedTransactions = numberOfGeneratedTransactions;
    this.finalTransactionAmount = finalTransactionAmount;
    this.finalTransactionId = finalTransactionId;
  }
}

export { GeneratorSummary };
