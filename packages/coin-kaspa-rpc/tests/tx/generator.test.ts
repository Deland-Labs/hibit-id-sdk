import { describe, expect, it } from 'vitest';
import {
  ClientUtxoEntry,
  DataKind,
  Fees,
  Generator,
  GeneratorSettings,
  Hash,
  PaymentOutput,
  SignableTransaction,
  Transaction,
  TransactionInput,
  TransactionOutpoint,
  TransactionOutput,
  UtxoEntry,
  UtxoEntryReference
} from '../../src/lib/tx';
import { Address, kaspaToSompi, NetworkId, NetworkType, ScriptPublicKey, SubnetworkId } from '../../src/lib';
import * as fs from 'node:fs';
import { base } from '@delandlabs/crypto-lib';

const SENDER_ADDR = 'kaspatest:qzzzvv57j68mcv3rsd2reshhtv4rcw4xc8snhenp2k4wu4l30jfjxlgfr8qcz';
const RECEIVER_ADDR = 'kaspatest:qrjcg7hsgjapumpn8egyu6544qzdqs2lssas4nfwewl55lnenr5pyzd7cmyx6';
const TESTNET_10 = new NetworkId(NetworkType.Testnet, 10);
const PRIORITY_FEES = new Fees(kaspaToSompi(0.02));

describe('Generator', () => {
  const sentKas10 = new SendKasPramas(SENDER_ADDR, kaspaToSompi(10), RECEIVER_ADDR);
  const send1Kas10K = new SendKasPramas(SENDER_ADDR, kaspaToSompi(10000), RECEIVER_ADDR);
  const sendKas1M = new SendKasPramas(SENDER_ADDR, kaspaToSompi(1000000), RECEIVER_ADDR);
  const testCases = [
    { name: '10 KAS', params: sentKas10 },
    { name: '10K KAS', params: send1Kas10K },
    { name: '1M KAS', params: sendKas1M }
  ];

  const resultSendKas10 = parseTxsFromFile('tests/tx/data/send10kas.json');
  const resultSendKas10K = parseTxsFromFile('tests/tx/data/sendkas10k.json');
  const resultSendKas1M = parseTxsFromFile('tests/tx/data/sendkas1m.json');

  const testReuslts = [resultSendKas10, resultSendKas10K, resultSendKas1M];

  for (let i = 0; i < testCases.length; i++) {
    it(`should generate a transaction for ${testCases[i].name}`, () => {
      if (!existTestDataFiles()) {
        // ignore all test when data files are not exist
        return;
      }
      const utxos = parseUtxosFromFile('tests/tx/data/utxos.json');
      const generator = new Generator(testCases[i].params.toGeneratorSettings(utxos));
      const txs = new Array<SignableTransaction>();

      while (true) {
        const transaction = generator.generateTransaction();
        if (transaction === undefined) {
          break;
        }
        txs.push(transaction);
      }

      expect(txs.length).equals(testReuslts[i].length);
      const tx = txs[0].tx;
      const result = testReuslts[i][0].tx;
      expect(tx.inputs).deep.equals(result.inputs);
      expect(tx.outputs.length).equals(result.outputs.length);
      for (let j = 0; j < tx.outputs.length; j++) {
        const output1 = tx.outputs[j];
        const output2 = result.outputs[j];

        const val1 = output1.value;
        const val2 = output2.value;
        const script1 = output1.scriptPublicKey.toHex();
        const script2 = output2.scriptPublicKey.toHex();

        expect(val1).equals(val2);
        expect(script1).equals(script2);
      }
      expect(tx.outputs).deep.equals(result.outputs);
      expect(tx).deep.equals(result);
      // for (let j = 0; j < txs.length; j++) {
      //   expect(txs[j]).deep.equals(testReuslts[i][j]);
      // }
    });
  }
});

class SendKasPramas {
  sender: Address;
  amount: bigint;
  receiver: Address;

  constructor(sender: string, amount: bigint, receiver: string) {
    this.sender = Address.fromString(sender);
    this.amount = amount;
    this.receiver = Address.fromString(receiver);
  }

  toGeneratorSettings(uxtos: UtxoEntryReference[] = []): GeneratorSettings {
    const output = new PaymentOutput(this.receiver, this.amount);
    return new GeneratorSettings(output, this.sender, uxtos, TESTNET_10, PRIORITY_FEES);
  }
}

function parseTxsFromFile(file: string): SignableTransaction[] {
  const fileContent = fs.readFileSync(file, 'utf8');
  const txs = parseWithBigInt(fileContent);

  return txs.map((tx: any) => {
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

    const txId = transaction.id.toHex();
    console.log(txId);

    return new SignableTransaction(
      transaction,
      entries,
      BigInt(tx.paymentAmount),
      BigInt(tx.changeAmount),
      BigInt(tx.aggregateInputAmount),
      BigInt(tx.aggregateOutputAmount),
      Number(tx.minimumSignatures),
      BigInt(tx.mass),
      BigInt(tx.feeAmount),
      tx.type === 'final' ? DataKind.Final : DataKind.Node
    );
  });
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

function stringifyWithBigInt(obj) {
  return JSON.stringify(obj, (key, value) => {
    return typeof value === 'bigint' ? value.toString() + 'n' : value;
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

function existTestDataFiles() {
  return fs.existsSync('tests/tx/data/utxos.json') && fs.existsSync('tests/tx/data/send10kas.json');
}
