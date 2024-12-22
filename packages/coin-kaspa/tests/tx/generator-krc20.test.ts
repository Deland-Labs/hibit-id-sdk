import { describe, expect, it } from 'vitest';
import { Fees, Generator, SignableTransaction } from '../../src/lib/tx';
import { kaspaToSompi, NetworkId, NetworkType, SendKrc20Params } from '../../src/lib';
import { parseTxsFromFile, parseUtxosFromFile } from './test-helper';
import { SignedType } from '../../src/lib/tx/generator/model/signed-tx';

const SENDDER_PK = '5cd51b74226a845b8c757494136659997db1aaedf34c528e297f849f0fe87faf';
const SENDER_ADDR = 'kaspatest:qzzzvv57j68mcv3rsd2reshhtv4rcw4xc8snhenp2k4wu4l30jfjxlgfr8qcz';
const RECEIVER_ADDR = 'kaspatest:qrjcg7hsgjapumpn8egyu6544qzdqs2lssas4nfwewl55lnenr5pyzd7cmyx6';
const TESTNET_10 = new NetworkId(NetworkType.Testnet, 10);
const PRIORITY_FEES = new Fees(kaspaToSompi(0.02));
const OUTPUT_AMOUNT = kaspaToSompi(0.3);

describe('Generator kas tx', () => {
  const sentKrc20CommitTx = new SendKrc20Params(
    SENDER_ADDR,
    kaspaToSompi(101),
    RECEIVER_ADDR,
    'KAST',
    TESTNET_10,
    OUTPUT_AMOUNT,
    PRIORITY_FEES
  );
  const resultSendKrc20CommitTx = parseTxsFromFile('tests/tx/data/sendkrc20-commit-tx.json');
  const resultSendKrc20RevealTx = parseTxsFromFile('tests/tx/data/sendkrc20-reveal-tx.json');
  const resultSendKrc20RevealTxSigned = parseTxsFromFile('tests/tx/data/sendkrc20-reveal-signed-tx.json');
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

    const signedTx = revealTxs[0].sign([SENDDER_PK]);
    expect(signedTx.type).equals(SignedType.Partially);
    const unsignedInputIndex = signedTx.transaction.tx.inputs.findIndex((i) => i.signatureScript.length === 0);
    expect(unsignedInputIndex).equals(0);

    if (unsignedInputIndex !== -1) {
      const inputSig = signedTx.transaction.createInputSignature(unsignedInputIndex, SENDDER_PK);
      const encodedSig = sentKrc20CommitTx.script.encodePayToScriptHashSignatureScript(inputSig);
      signedTx.transaction.fillInputSignature(unsignedInputIndex, encodedSig);
    }

    expect(signedTx.transaction.tx.payload).deep.equals(resultSendKrc20RevealTxSigned[0].tx.payload);
    expect(signedTx.transaction.tx.inputs[unsignedInputIndex].signatureScript).deep.be.not.equals(
      resultSendKrc20RevealTxSigned[0].tx.inputs[0].signatureScript
    );

    const submitableTx = signedTx.toSubmitableJson();

    expect(submitableTx.id).equals(resultSendKrc20RevealTxSigned[0].id.toHex());
  });
});