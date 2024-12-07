import { Address, Generator, GeneratorSettings, GeneratorSummary, Hash, KaspaNetwork, NetworkId, NetworkType, RpcUtxosByAddressesEntry, ScriptPublicKey, SignableTransaction, SubmitTransactionRequestMessage, TransactionOutpoint, UtxoEntryReference, SignedTransaction, Transaction } from "@delandlabs/coin-kaspa-rpc"

export const createTransactions = (settings: GeneratorSettings): {
  transactions: SignableTransaction[]
  summary: GeneratorSummary
} => {
  const generator = new Generator(settings)
  const transactions = []
  while (true) {
    const tx: SignableTransaction | undefined = generator.generateTransaction()
    if (tx) {
      transactions.push(tx)
    } else {
      break
    }
  }
  const summary = generator.summary()
  return {
    transactions,
    summary
  }
}

export const rpcUtxosToUtxoEntries = (utxos: RpcUtxosByAddressesEntry[]): UtxoEntryReference[] => {
  return utxos.map((utxo) => new UtxoEntryReference(
    Address.fromString(utxo.address),
    new TransactionOutpoint(Hash.fromString(utxo.outpoint!.transactionId), utxo.outpoint!.index),
    BigInt(utxo.utxoEntry?.amount ?? 0),
    ScriptPublicKey.fromHex(utxo.utxoEntry!.scriptPublicKey!),
    BigInt(utxo.utxoEntry?.blockDaaScore ?? 0),
    utxo.utxoEntry?.isCoinbase ?? false,
  ))
}

export const kaspaNetworkToNetworkId = (network: KaspaNetwork): NetworkId => {
  const isMainnet = network === 'mainnet'
  return new NetworkId(isMainnet ? NetworkType.Mainnet : NetworkType.Testnet, isMainnet ? undefined : 10)
}

// export const signedTransactionToSubmitTransactionMessage = (signedTransaction: SignedTransaction, utxos: UtxoEntryReference[]): SubmitTransactionRequestMessage => {
//   const tx = signedTransaction.transaction as Transaction
//   return {
//     transaction: {
//       // id: tx.id.toString(),
//       version: tx.version,
//       inputs: tx.inputs.map((input, index) => ({
//         // previousOutpoint: {
//           transactionId: input.previousOutpoint.transactionId.toString(),
//           index: input.previousOutpoint.index,
//         // },
//         signatureScript: Buffer.from(input.signatureScript).toString('hex'),
//         sequence: String(input.sequence),
//         sigOpCount: input.sigOpCount,
//         verboseData: undefined,
//         utxo: {
//           address: utxos[index].address?.toString(),
//           amount: utxos[index].amount.toString(),
//           scriptPublicKey: utxos[index].scriptPublicKey.toHex(),
//           blockDaaScore: utxos[index].blockDaaScore.toString(),
//           isCoinbase: utxos[index].isCoinbase,
//         }
//       })),
//       outputs: tx.outputs.map((output) => ({
//         value: String(output.value),
//         scriptPublicKey: {
//           version: output.scriptPublicKey.version,
//           script: output.scriptPublicKey.toHex(),
//         },
//         verboseData: undefined,
//       })),
//       lockTime: String(tx.lockTime),
//       subnetworkId: tx.subnetworkId.toString(),
//       gas: String(tx.gas),
//       payload: Buffer.from(tx.payload).toString('hex'),
//       // verboseData: undefined,
//       mass: String(tx.mass),
//       verboseData: undefined
//     },
//     allowOrphan: false,
//   } as any
// }