/**
 * WebSocket event type definitions for Kaspa UTXO changes
 */
export interface UtxoChangedEvent {
  UtxosChanged: {
    added?: Array<{ address: string; outpoint?: { transactionId: string } }>;
    removed?: Array<{ address: string; outpoint?: { transactionId: string } }>;
  };
}

/**
 * Generic event handler type for WebSocket events
 */
export type EventHandler<T = unknown> = (data: T) => void;

/**
 * UTXO change event handler type
 */
export type UtxoChangeHandler = EventHandler<UtxoChangedEvent>;

/**
 * Chain change event from Kaspa network
 */
export interface ChainChangeEvent {
  acceptedTransactionIds?: Array<{
    acceptedTransactionIds?: string[];
    acceptingBlockHash?: string;
  }>;
}

/**
 * Transaction submission function type
 */
export interface TransactionSubmitFunction {
  (transaction: any): Promise<{ transactionId: string }>;
}

/**
 * KRC20 transfer parameters interface
 */
export interface Krc20TransferParams {
  script: {
    encodePayToScriptHashSignatureScript(signature: Uint8Array): Uint8Array;
  };
}
