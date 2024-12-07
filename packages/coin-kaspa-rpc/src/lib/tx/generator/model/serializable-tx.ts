/**
 * Represents a serializable transaction.
 */
export interface ISerializableTransaction {
  id: string; // TransactionId
  version: number; // u16
  inputs: ISerializableTransactionInput[];
  outputs: ISerializableTransactionOutput[];
  lockTime: string; // u64
  gas: string; // u64
  mass: string; // u64
  subnetworkId: string; // SubnetworkId
  payload: string; // Hex-encoded string
}

/**
 * Represents a serializable transaction input.
 */
export interface ISerializableTransactionInput {
  transactionId: string; // TransactionId
  index: number; // SignedTransactionIndexType
  sequence: string; // u64
  sigOpCount: number; // u8
  signatureScript: string; // Hex-encoded string
  utxo: ISerializableUtxoEntry;
}

/**
 * Represents a serializable transaction output.
 */
export interface ISerializableTransactionOutput {
  value: string; // u64
  scriptPublicKey: ISerializableScriptPublicKey;
}

/**
 * Represents a serializable UTXO (Unspent Transaction Output) entry.
 */
export interface ISerializableUtxoEntry {
  address: string | null; // Option<Address>
  amount: string; // u64
  scriptPublicKey: ISerializableScriptPublicKey;
  blockDaaScore: string; // u64
  isCoinbase: boolean;
}

/**
 * Represents a serializable script public key.
 */
export interface ISerializableScriptPublicKey {
  version: number; // u32
  scriptPublicKey: string; // Hex-encoded string
}
