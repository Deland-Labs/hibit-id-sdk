import { KaspadWrpcClient } from "./kaspad-wrpc";
import { Krc20RpcClient } from "./krc20-rpc";
import { KaspaNetwork, Krc20TokenBalanceInfo, Krc20TokenDetailsWithHolders } from "./types";

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

  transfer = async (from: string, to: string, amount: string): Promise<string> => {
    // TODO:
    return ''
  }

  getKrc20TokenInfo = async (tick: string): Promise<Krc20TokenDetailsWithHolders | null> => {
    const res = await this.krc20RpcClient.getKrc20TokenInfo(tick)
    return res[0] ?? null
  }

  getKrc20AddressTokenList = async (address: string): Promise<Krc20TokenBalanceInfo[]> => {
    return await this.krc20RpcClient.getKrc20AddressTokenList(address)
  }

  getKrc20Balance = async (address: string, tick: string): Promise<Krc20TokenBalanceInfo | null> => {
    const res = await this.krc20RpcClient.getKrc20Balance(address, tick)
    for (const item of res) {
      if (item.tick.toUpperCase() === tick.toUpperCase()) {
        return item
      }
    }
    return null
  }
}
