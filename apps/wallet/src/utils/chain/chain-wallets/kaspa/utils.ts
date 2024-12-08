import { Address, Generator, GeneratorSettings, GeneratorSummary, Hash, KaspaNetwork, NetworkId, NetworkType, RpcUtxosByAddressesEntry, ScriptPublicKey, SignableTransaction, TransactionOutpoint, UtxoEntryReference } from "@delandlabs/coin-kaspa-rpc"

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
