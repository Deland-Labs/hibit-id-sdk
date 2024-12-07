import { describe, expect, it } from 'vitest';
import {
  Fees,
  Generator,
  GeneratorSettings,
  PaymentOutput,
  SignableTransaction,
  UtxoEntryReference
} from '../../src/lib/tx';
import { Address, kaspaToSompi, NetworkId, NetworkType } from '../../src/lib';
import { ScriptBuilder, OpCodes } from '../../src/lib/tx-script';
import { parseTxsFromFile, parseUtxosFromFile } from './test-helper';
import { addressFromScriptPublicKey } from '../../src/lib/utils';

const SENDER_ADDR = 'kaspatest:qzzzvv57j68mcv3rsd2reshhtv4rcw4xc8snhenp2k4wu4l30jfjxlgfr8qcz';
const RECEIVER_ADDR = 'kaspatest:qrjcg7hsgjapumpn8egyu6544qzdqs2lssas4nfwewl55lnenr5pyzd7cmyx6';
const TESTNET_10 = new NetworkId(NetworkType.Testnet, 10);
const PRIORITY_FEES = new Fees(kaspaToSompi(0.02));

describe('Generator kas tx', () => {
  const sentKrc20 = new SendKrc20Pramas(SENDER_ADDR, kaspaToSompi(101), RECEIVER_ADDR, 'KAST');
  const resultSendKrc20 = parseTxsFromFile('tests/tx/data/sendkrc20.json');
  const utxos = parseUtxosFromFile('tests/tx/data/utxos.json');

  it(`should generate send krc20 transactions should success`, () => {
    const generator = new Generator(sentKrc20.toGeneratorSettings(utxos));
    const txs = new Array<SignableTransaction>();

    while (true) {
      const transaction = generator.generateTransaction();
      if (transaction === undefined) {
        break;
      }
      txs.push(transaction);
    }
    expect(txs).deep.equals(resultSendKrc20);
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

  toGeneratorSettings(uxtos: UtxoEntryReference[] = []): GeneratorSettings {
    const data = {
      p: 'krc-20',
      op: 'transfer',
      tick: this.tick,
      amt: this.amount.toString(),
      to: this.receiver.toString()
    };
    const script = new ScriptBuilder()
      .addData(this.sender.payload)
      .addOp(OpCodes.OpCheckSig)
      .addOp(OpCodes.OpFalse)
      .addOp(OpCodes.OpIf)
      .addData(Buffer.from('kasplex'))
      .addI64(0n)
      .addData(Buffer.from(JSON.stringify(data, null, 0)))
      .addOp(OpCodes.OpEndIf);

    const P2SHAddress = addressFromScriptPublicKey(script.createPayToScriptHashScript(), TESTNET_10.networkType)!;

    const output = new PaymentOutput(P2SHAddress, kaspaToSompi(0.3));
    return new GeneratorSettings(output, this.sender, uxtos, TESTNET_10, PRIORITY_FEES);
  }
}
