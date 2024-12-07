import { describe, expect, it } from 'vitest';
import {
  Fees,
  Generator,
  GeneratorSettings,
  PaymentOutput,
  SignableTransaction,
  TransactionId,
  TransactionOutpoint,
  UtxoEntryReference
} from '../../src/lib/tx';
import { Address, kaspaToSompi, NetworkId, NetworkType } from '../../src/lib';
import { ScriptBuilder, OpCodes } from '../../src/lib/tx-script';
import { parseTxsFromFile, parseUtxosFromFile } from './test-helper';
import { addressFromScriptPublicKey } from '../../src/lib/utils';
import { SignedType } from '../../src/lib/tx/generator/model/signed-tx';

const SENDER_ADDR = 'kaspatest:qzzzvv57j68mcv3rsd2reshhtv4rcw4xc8snhenp2k4wu4l30jfjxlgfr8qcz';
const RECEIVER_ADDR = 'kaspatest:qrjcg7hsgjapumpn8egyu6544qzdqs2lssas4nfwewl55lnenr5pyzd7cmyx6';
const TESTNET_10 = new NetworkId(NetworkType.Testnet, 10);
const PRIORITY_FEES = new Fees(kaspaToSompi(0.02));

describe('Generator kas tx', () => {
  const sentKrc20CommitTx = new SendKrc20Pramas(SENDER_ADDR, kaspaToSompi(101), RECEIVER_ADDR, 'KAST');
  const resultSendKrc20CommitTx = parseTxsFromFile('tests/tx/data/sendkrc20-commit-tx.json');
  const resultSendKrc20RevealTx = parseTxsFromFile('tests/tx/data/sendkrc20-reveal-tx.json');
  const utxos = parseUtxosFromFile('tests/tx/data/utxos.json');

  it(`should generate send krc20 transactions should success`, () => {
    const generatorCommit = new Generator(sentKrc20CommitTx.toCommitTxGeneratorSettings(utxos));
    const commitTxs = new Array<SignableTransaction>();

    // commit tx
    while (true) {
      const transaction = generatorCommit.generateTransaction();
      if (transaction === undefined) {
        break;
      }
      commitTxs.push(transaction);
    }
    expect(commitTxs).deep.equals(resultSendKrc20CommitTx);

    const finalCommitTx = commitTxs[commitTxs.length - 1];

    const newUtxos = utxos.filter((o) =>
      commitTxs.some(
        (tx) =>
          !tx.entries.some(
            (e) => e.outpoint.transactionId === o.outpoint.transactionId && e.outpoint.index === o.outpoint.index
          )
      )
    );

    // reveal tx
    const generatorReveal = new Generator(sentKrc20CommitTx.toRevealTxGeneratorSettings(newUtxos, finalCommitTx.id));
    const revealTxs = new Array<SignableTransaction>();

    while (true) {
      const transaction = generatorReveal.generateTransaction();
      if (transaction === undefined) {
        break;
      }
      revealTxs.push(transaction);
    }
    expect(revealTxs).deep.equals(resultSendKrc20RevealTx);

    const signedTx = revealTxs[0].sign(['5cd51b74226a845b8c757494136659997db1aaedf34c528e297f849f0fe87faf']);
    expect(signedTx.type).equals(SignedType.Partially);
    const unsignedInputIndex = signedTx.transaction.tx.inputs.findIndex((i) => i.signatureScript.length === 0);
    expect(unsignedInputIndex).equals(0);

    const signedTx2 = signedTx.transaction.toSubmitable();
  });
});

class SendKrc20Pramas {
  sender: Address;
  amount: bigint;
  receiver: Address;
  tick: string;
  dec: number = 8;

  constructor(sender: string, amount: bigint, receiver: string, tick: string) {
    this.sender = Address.fromString(sender);
    this.amount = amount;
    this.receiver = Address.fromString(receiver);
    this.tick = tick;
  }

  toCommitTxGeneratorSettings(uxtos: UtxoEntryReference[] = []): GeneratorSettings {
    const P2SHAddress = addressFromScriptPublicKey(this.script.createPayToScriptHashScript(), TESTNET_10.networkType)!;

    const output = new PaymentOutput(P2SHAddress, kaspaToSompi(0.3));
    return new GeneratorSettings(output, this.sender, uxtos, TESTNET_10, PRIORITY_FEES);
  }

  toRevealTxGeneratorSettings(uxtos: UtxoEntryReference[] = [], commitTxId: TransactionId): GeneratorSettings {
    const P2SHAddress = addressFromScriptPublicKey(this.script.createPayToScriptHashScript(), TESTNET_10.networkType)!;
    const priorityEntries = [
      new UtxoEntryReference(
        P2SHAddress,
        new TransactionOutpoint(commitTxId, 0),
        kaspaToSompi(0.3),
        this.script.createPayToScriptHashScript(),
        0n,
        false
      )
    ];
    return new GeneratorSettings([], this.sender, uxtos, TESTNET_10, PRIORITY_FEES, priorityEntries);
  }

  private get script(): ScriptBuilder {
    const data = {
      p: 'krc-20',
      op: 'transfer',
      tick: this.tick,
      amt: this.amount.toString(),
      to: this.receiver.toString()
    };
    return new ScriptBuilder()
      .addData(this.sender.payload)
      .addOp(OpCodes.OpCheckSig)
      .addOp(OpCodes.OpFalse)
      .addOp(OpCodes.OpIf)
      .addData(Buffer.from('kasplex'))
      .addI64(0n)
      .addData(Buffer.from(JSON.stringify(data, null, 0)))
      .addOp(OpCodes.OpEndIf);
  }
}
