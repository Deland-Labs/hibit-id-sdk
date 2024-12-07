import { KaspadWrpcClient } from "./kaspad-wrpc";
import { Krc20RpcClient } from "./krc20-rpc";
import { KaspaNetwork, Krc20TokenBalanceInfo, Krc20TokenDetailsWithHolders } from "./types";
import { RpcFeeEstimate, RpcUtxosByAddressesEntry, SubmitTransactionRequestMessage } from "./compiled_proto/rpc";

export class KaspaRpc {
  private krc20RpcClient: Krc20RpcClient
  private kaspadWrpcClient: KaspadWrpcClient

  constructor(network: KaspaNetwork) {
    this.krc20RpcClient = new Krc20RpcClient(network)
    this.kaspadWrpcClient = new KaspadWrpcClient(network)
  }

  getBalance = async (address: string): Promise<string> => {
    const balance = await this.kaspadWrpcClient.getBalanceByAddress(address)
    return String(balance)
  }

  submitTransaction = async (input: SubmitTransactionRequestMessage): Promise<string> => {
    const res = await this.kaspadWrpcClient.submitTransaction(input)
    return res.transactionId
  }

  getFeeEstimate = async (): Promise<RpcFeeEstimate | null> => {
    return await this.kaspadWrpcClient.getFeeEstimate()
  }

  getUtxosByAddress = async (address: string): Promise<RpcUtxosByAddressesEntry[]> => {
    return await this.kaspadWrpcClient.getUtxosByAddress(address)
  }

  getKrc20TokenInfo = async (tick: string): Promise<Krc20TokenDetailsWithHolders | null> => {
    const res = await this.krc20RpcClient.getKrc20TokenInfo(tick)
    return res.result[0] ?? null
  }

  getKrc20AddressTokenList = async (address: string): Promise<Krc20TokenBalanceInfo[]> => {
    const res = await this.krc20RpcClient.getKrc20AddressTokenList(address)
    return res.result
  }

  getKrc20Balance = async (address: string, tick: string): Promise<Krc20TokenBalanceInfo | null> => {
    const res = await this.krc20RpcClient.getKrc20Balance(address, tick)
    for (const item of res.result) {
      if (item.tick.toUpperCase() === tick.toUpperCase()) {
        return item
      }
    }
    return null
  }
}
