/**
 * Represents a serializable transaction.
 */
export interface ISerializableTransaction {
  id: string; // TransactionId
  version: number; // u16
  inputs: ISerializableTransactionInput[];
  outputs: ISerializableTransactionOutput[];
  lockTime: bigint; // u64
  gas: bigint; // u64
  mass: bigint; // u64
  subnetworkId: string; // SubnetworkId
  payload: string; // Hex-encoded string
}

/**
 * Represents a serializable transaction input.
 */
export interface ISerializableTransactionInput {
  transactionId: string; // TransactionId
  index: number; // SignedTransactionIndexType
  sequence: bigint; // u64
  sigOpCount: number; // u8
  signatureScript: string; // Hex-encoded string
  utxo: ISerializableUtxoEntry;
}

/**
 * Represents a serializable transaction output.
 */
export interface ISerializableTransactionOutput {
  value: bigint; // u64
  scriptPublicKey: ISerializableScriptPublicKey;
}

/**
 * Represents a serializable UTXO (Unspent Transaction Output) entry.
 */
export interface ISerializableUtxoEntry {
  address: string | null; // Option<Address>
  amount: bigint; // u64
  scriptPublicKey: ISerializableScriptPublicKey;
  blockDaaScore: bigint; // u64
  isCoinbase: boolean;
}

/**
 * Represents a serializable script public key.
 */
export interface ISerializableScriptPublicKey {
  version: number; // u32
  scriptPublicKey: string; // Hex-encoded string
}
