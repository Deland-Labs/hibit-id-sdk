import {
  ClientUtxoEntry,
  DataKind,
  Hash,
  SignableTransaction,
  Transaction,
  TransactionInput,
  TransactionOutpoint,
  TransactionOutput,
  UtxoEntry,
  UtxoEntryReference
} from '../../src/lib/tx';
import { Address, ScriptPublicKey, SubnetworkId } from '../../src/lib';
import * as fs from 'node:fs';
import { base } from '@delandlabs/crypto-lib';

function parseTxsFromFile(file: string): SignableTransaction[] {
  const fileContent = fs.readFileSync(file, 'utf8');
  const txs = parseWithBigInt(fileContent);

  const result = [];
  const lastSecondIndex = txs.length - 2;
  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const transaction = new Transaction(
      tx.transaction.version,
      tx.transaction.inputs.map(
        (input: any) =>
          new TransactionInput(
            new TransactionOutpoint(Hash.fromHex(input.previousOutpoint.transactionId), input.previousOutpoint.index),
            base.fromHex(input.signatureScript),
            BigInt(input.sequence),
            input.sigOpCount
          )
      ),
      tx.transaction.outputs.map(
        (output: any) =>
          new TransactionOutput(
            BigInt(output.value),
            new ScriptPublicKey(output.scriptPublicKey.version, base.fromHex(output.scriptPublicKey.script))
          )
      ),
      BigInt(tx.transaction.lockTime),
      new SubnetworkId(base.fromHex(tx.transaction.subnetworkId)),
      BigInt(tx.transaction.gas),
      base.fromHex(tx.transaction.payload)
    );

    const mass = BigInt(tx.mass | 0n);
    transaction.setMass(mass);

    const entries = tx.transaction.inputs.map((input: any) => {
      const utxo = input.utxo;
      return new UtxoEntry(
        BigInt(utxo.amount),
        new ScriptPublicKey(utxo.scriptPublicKey.version, base.fromHex(utxo.scriptPublicKey.script)),
        BigInt(utxo.blockDaaScore),
        utxo.isCoinbase
      );
    });

    result.push(
      new SignableTransaction(
        transaction,
        entries,
        BigInt(tx.paymentAmount),
        BigInt(tx.changeAmount),
        BigInt(tx.aggregateInputAmount),
        BigInt(tx.aggregateOutputAmount),
        Number(tx.minimumSignatures),
        BigInt(tx.mass),
        BigInt(tx.feeAmount),
        tx.type === 'final' ? DataKind.Final : i === lastSecondIndex ? DataKind.Edge : DataKind.Node
      )
    );
  }
  return result;
}

function parseUtxosFromFile(file: string): UtxoEntryReference[] {
  const fileContent = fs.readFileSync(file, 'utf8');
  const utxos = parseWithBigInt(fileContent);

  return utxos.map((utxo: any) => {
    const val = new ClientUtxoEntry(
      Address.fromString(utxo.address.prefix + ':' + utxo.address.payload),
      new TransactionOutpoint(Hash.fromHex(utxo.outpoint.transactionId), utxo.outpoint.index),
      BigInt(utxo.amount),
      new ScriptPublicKey(utxo.scriptPublicKey.version, base.fromHex(utxo.scriptPublicKey.script)),
      BigInt(utxo.blockDaaScore),
      utxo.isCoinbase
    );
    return new UtxoEntryReference(val);
  });
}

function parseWithBigInt(jsonString: string) {
  return JSON.parse(jsonString, (_, value) => {
    if (typeof value === 'string' && value.endsWith('n')) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
}

export { parseTxsFromFile, parseUtxosFromFile };
