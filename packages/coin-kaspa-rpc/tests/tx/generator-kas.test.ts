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
import { parseTxsFromFile, parseUtxosFromFile } from './test-helper';

const SENDER_ADDR = 'kaspatest:qzzzvv57j68mcv3rsd2reshhtv4rcw4xc8snhenp2k4wu4l30jfjxlgfr8qcz';
const RECEIVER_ADDR = 'kaspatest:qrjcg7hsgjapumpn8egyu6544qzdqs2lssas4nfwewl55lnenr5pyzd7cmyx6';
const TESTNET_10 = new NetworkId(NetworkType.Testnet, 10);
const PRIORITY_FEES = new Fees(kaspaToSompi(0.02));

describe('Generator kas tx', () => {
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

  const utxos = parseUtxosFromFile('tests/tx/data/utxos.json');
  const testReuslts = [resultSendKas10, resultSendKas10K, resultSendKas1M];

  for (let i = 0; i < testCases.length; i++) {
    it(`should generate transactions success for ${testCases[i].name}`, () => {
      const generator = new Generator(testCases[i].params.toGeneratorSettings(utxos));
      const txs = new Array<SignableTransaction>();

      while (true) {
        const transaction = generator.generateTransaction();
        if (transaction === undefined) {
          break;
        }
        txs.push(transaction);
      }
      expect(txs).deep.equals(testReuslts[i]);
    });

    it(`should generate transactions fail without utxos for ${testCases[i].name} with mass`, () => {
      const generator = new Generator(testCases[i].params.toGeneratorSettings());
      const txs = new Array<SignableTransaction>();

      expect(() => {
        while (true) {
          const transaction = generator.generateTransaction();
          if (transaction === undefined) {
            break;
          }
          txs.push(transaction);
        }
      }).toThrow(/InsufficientFunds/);
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
