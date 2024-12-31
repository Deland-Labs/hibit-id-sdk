import {
  GeneratorSettings,
  SignableTransaction,
  GeneratorSummary,
  Generator
} from '@kcoin/kaspa-web3.js';

export const createTransactions = (
  settings: GeneratorSettings
): {
  transactions: SignableTransaction[];
  summary: GeneratorSummary;
} => {
  const generator = new Generator(settings);
  const transactions = [];
  while (true) {
    const tx: SignableTransaction | undefined = generator.generateTransaction();
    if (tx) {
      transactions.push(tx);
    } else {
      break;
    }
  }
  const summary = generator.summary();
  return {
    transactions,
    summary
  };
};
