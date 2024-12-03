import { NetworkId } from 'src/lib/consensus';
import { Fees, PaymentOutput, UtxoEntry, UtxoEntryReference } from 'src/lib/tx/model';
import { Address } from 'src/lib/address';

class GeneratorSettings {
  outputs: PaymentOutput[];
  changeAddress: Address;
  priorityFee?: Fees;
  entries: UtxoEntry[];
  priorityEntries?: UtxoEntry[];
  sigOpCount?: number;
  minimumSignatures?: number;
  payload?: Uint8Array;
  networkId?: NetworkId;

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
    this.sigOpCount = sigOpCount;
    this.minimumSignatures = minimumSignatures;
    this.payload = payload;
  }
}

export { GeneratorSettings };
