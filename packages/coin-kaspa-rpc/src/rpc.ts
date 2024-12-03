import { KaspadWrpcClient } from "./kaspad-wrpc";
import { Krc20RpcClient } from "./krc20-rpc";
import { KaspaNetwork } from "./types";

export class KaspaRpc {
  private krc20RpcClient: Krc20RpcClient
  private kaspadWrpcClient: KaspadWrpcClient

  constructor(network: KaspaNetwork) {
    this.krc20RpcClient = new Krc20RpcClient(network)
    this.kaspadWrpcClient = new KaspadWrpcClient(network)
  }

  public async getBalance(address: string): Promise<number> {
    return await this.kaspadWrpcClient.getBalanceByAddress(address)
  }
}
