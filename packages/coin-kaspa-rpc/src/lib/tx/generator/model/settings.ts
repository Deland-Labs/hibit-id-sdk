import { NetworkId } from 'src/lib/consensus';
import { Fees, PaymentOutput, UtxoEntryReference } from 'src/lib/tx/model';
import { Address } from 'src/lib/address';

// let settings = GeneratorSettings {
//   network_id,
//     multiplexer,
//     sig_op_count,
//     minimum_signatures,
//     change_address,
//     utxo_iterator: Box::new(utxo_iterator),
//     source_utxo_context: None,
//     priority_utxo_entries,
//
//     final_transaction_priority_fee: final_priority_fee,
//     final_transaction_destination,
//     final_transaction_payload,
//     destination_utxo_context: None,
// };

class GeneratorSettings {
  outputs: PaymentOutput[];
  changeAddress: Address;
  priorityFee?: Fees;
  entries: UtxoEntryReference[];
  priorityEntries?: UtxoEntryReference[];
  sigOpCount: number;
  minimumSignatures: number;
  payload?: Uint8Array;
  networkId: NetworkId;

  constructor(
    outputs: PaymentOutput | PaymentOutput[],
    changeAddress: Address | string,
    entries: UtxoEntryReference[],
    networkId: NetworkId | string,
    priorityFee?: Fees | bigint,
    priorityEntries?: UtxoEntryReference[],
    sigOpCount?: number,
    minimumSignatures?: number,
    payload?: Uint8Array
  ) {
    this.outputs = outputs instanceof PaymentOutput ? [outputs] : outputs;
    this.changeAddress = changeAddress instanceof Address ? changeAddress : Address.fromString(changeAddress);
    this.entries = entries;
    this.networkId = networkId instanceof NetworkId ? networkId : NetworkId.fromString(networkId);
    this.priorityFee = this.priorityFee =
      priorityFee instanceof Fees ? priorityFee : priorityFee !== undefined ? new Fees(priorityFee) : undefined;
    this.priorityEntries = priorityEntries;
    this.sigOpCount = sigOpCount ?? 1;
    this.minimumSignatures = minimumSignatures ?? 1;
    this.payload = payload;
  }
}

export { GeneratorSettings };
