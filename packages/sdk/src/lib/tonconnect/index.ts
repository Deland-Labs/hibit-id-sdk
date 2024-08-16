import { AppRequest, ConnectEvent, ConnectRequest, DeviceInfo, WalletEvent, WalletResponse } from "@tonconnect/protocol";
import { TonConnectBridge, TonConnectCallback, WalletInfo } from "./types";
import { HibitIdWallet } from "../wallet";
import { getDeviceInfo } from "./utils";

export class TonConnect implements TonConnectBridge {
  callbacks: TonConnectCallback[] = [];

  deviceInfo: DeviceInfo = getDeviceInfo();
  walletInfo: WalletInfo = {
    name: "HibitID",
    // TODO:
    image:
      "https://raw.githubusercontent.com/OpenProduct/openmask-extension/main/public/openmask-logo-288.png",
    // TODO:
    about_url: "https://www.openmask.app/",
  };
  protocolVersion = 2;
  isWalletBrowser = false;

  constructor(private provider: HibitIdWallet, tonconnect?: TonConnect) {
    // TODO:
    if (tonconnect) {
      this.callbacks = tonconnect.callbacks;
    } else {
      // provider.on("chainChanged", () => {
      //   this.notify({
      //     event: "disconnect",
      //     payload: {},
      //   });
      // });
    }
  }
  
  connect = async (protocolVersion: number, message: ConnectRequest): Promise<ConnectEvent> => {
    // TODO:
    return Promise.resolve({
      event: 'connect',
      id: 1,
      payload: {
        items: [],
        device: this.deviceInfo
      }
    })
  }

  restoreConnection = async (): Promise<ConnectEvent> => {
    // TODO:
    return Promise.resolve({
      event: 'connect',
      id: 1,
      payload: {
        items: [],
        device: this.deviceInfo
      }
    })
  }

  send = async (message: AppRequest<"sendTransaction" | "signData" | "disconnect">): Promise<WalletResponse<"sendTransaction" | "signData" | "disconnect">> => {
    // TODO:
    return Promise.resolve({
      result: 'success',
      id: '1'
    })  
  }

  listen = (callback: (event: WalletEvent) => void): () => void => {
    // TODO:
    return () => {}
  }
}
