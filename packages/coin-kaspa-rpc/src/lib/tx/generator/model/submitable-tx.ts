/**
 * Represents a submitable transaction.
 */
export interface ISubmitableTransaction {
  id: string; // TransactionId
  version: number; // u16
  inputs: ISubmitableTransactionInput[];
  outputs: ISubmitableTransactionOutput[];
  lockTime: number; // u64
  gas: number; // u64
  subnetworkId: string; // SubnetworkId
  payload: string; // Hex-encoded string
  mass: number; // u64
}

/**
 * Represents a submitable transaction input.
 */
export interface ISubmitableTransactionInput {
  previousOutpoint: ISubmitableTransactionOutpoint;
  sequence: number; // u64
  sigOpCount: number; // u8
  signatureScript: string; // Hex-encoded string
}

/**
 * Represents a submitable transaction outpoint.
 */
export interface ISubmitableTransactionOutpoint {
  /**
   * The ID of the transaction.
   */
  transactionId: string; // TransactionId

  /**
   * The index of the transaction output.
   */
  index: number; // SignedTransactionIndexType
}

/**
 * Represents a submitable transaction output.
 */
export interface ISubmitableTransactionOutput {
  value: number; // u64
  scriptPublicKey: ISubmitableScriptPublicKey;
}

/**
 * Represents a submitable script public key.
 */
export interface ISubmitableScriptPublicKey {
  version: number; // u32
  script: string; // Hex-encoded string
}
