import { GeneratorSettings, SignableTransaction, GeneratorSummary, Generator, Keypair } from '@kcoin/kaspa-web3.js';
import { TransactionSubmitFunction, Krc20TransferParams } from './types';

/**
 * Transaction utilities for Kaspa blockchain operations
 */
export class TransactionHelper {
  /**
   * Create transactions from generator settings
   */
  static createTransactions(settings: GeneratorSettings): {
    transactions: SignableTransaction[];
    summary: GeneratorSummary;
  } {
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
  }

  /**
   * Submit multiple transactions sequentially
   * @param transactions - Array of signable transactions
   * @param keypair - Keypair for signing transactions
   * @param submitFn - Function to submit a single transaction
   * @returns Promise resolving to the last transaction ID
   */
  static async submitTransactions(
    transactions: SignableTransaction[],
    keypair: Keypair,
    submitFn: TransactionSubmitFunction
  ): Promise<string> {
    let lastTxId = '';

    for (const tx of transactions) {
      const signedTx = tx.sign([keypair.privateKey!]);
      const reqMessage = signedTx.toSubmittableJsonTx();
      const result = await submitFn(reqMessage);
      lastTxId = result.transactionId;
    }

    return lastTxId;
  }

  /**
   * Submit KRC20 reveal transactions with special signature handling
   * @param transactions - Array of reveal transactions
   * @param keypair - Keypair for signing
   * @param krc20TransferParams - KRC20 transfer parameters containing script
   * @param submitFn - Function to submit a single transaction
   * @returns Promise resolving to the last transaction ID
   */
  static async submitKrc20RevealTransactions(
    transactions: SignableTransaction[],
    keypair: Keypair,
    krc20TransferParams: Krc20TransferParams,
    submitFn: TransactionSubmitFunction
  ): Promise<string> {
    let lastTxId = '';

    for (const revealTx of transactions) {
      const signedTx = revealTx.sign([keypair.privateKey!], false);

      // Process KRC20-specific signature handling
      this.processKrc20Signature(signedTx, keypair, krc20TransferParams);

      const reqMessage = signedTx.toSubmittableJsonTx();
      const result = await submitFn(reqMessage);
      lastTxId = result.transactionId;
    }

    return lastTxId;
  }

  /**
   * Process KRC20-specific signature for Pay-to-Script-Hash transactions
   * @param signedTx - The signed transaction to process
   * @param keypair - Keypair for creating signatures
   * @param krc20TransferParams - KRC20 transfer parameters containing script
   * @private
   */
  private static processKrc20Signature(
    signedTx: any, // SignedTransaction type from kaspa-web3.js
    keypair: Keypair,
    krc20TransferParams: Krc20TransferParams
  ): void {
    // Find the input that needs our signature (has empty signature script)
    const targetInputIndex = this.findEmptySignatureInput(signedTx);

    if (targetInputIndex !== -1) {
      // Create signature for the specific input
      const signature = signedTx.transaction.createInputSignature(targetInputIndex, keypair.privateKey!);

      // Encode signature using KRC20 script format
      const encodedSignature = krc20TransferParams.script.encodePayToScriptHashSignatureScript(signature);

      // Fill the input with the encoded signature
      signedTx.transaction.fillInputSignature(targetInputIndex, encodedSignature);
    }
  }

  /**
   * Find input with empty signature script that needs our signature
   * @param signedTx - The signed transaction to search
   * @returns Index of the input that needs signing, or -1 if not found
   * @private
   */
  private static findEmptySignatureInput(signedTx: any): number {
    return signedTx.transaction.tx.inputs.findIndex((input: any) => {
      // Convert signature script bytes to hex string and check if empty
      const signatureHex = Array.from(input.signatureScript)
        .map((b: unknown) => (b as number).toString(16).padStart(2, '0'))
        .join('');
      return signatureHex === '';
    });
  }
}
