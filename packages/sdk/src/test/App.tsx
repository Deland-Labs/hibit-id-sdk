import { FC, useEffect, useState } from "react";
import { HibitIdWallet } from "../lib/wallet";
import { HibitIdAssetType, HibitIdChainId } from "../lib";
import { WalletAccount } from "@delandlabs/coin-base";
import { BalanceChangeData } from "../lib/types";

const App: FC = () => {
  const [wallet, setWallet] = useState<HibitIdWallet | null>(null)
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [sig, setSig] = useState('')
  const [balance, setBalance] = useState('')
  const [chainId, setChainId] = useState('')
  const [isBackgroundEmbed, setIsBackgroundEmbed] = useState(false)

  useEffect(() => {
    const wallet = new HibitIdWallet({
      env: 'dev',
      chains: [],
      defaultChain: HibitIdChainId.EthereumSepolia,
      embedMode: 'float',
      controllerDefaultPosition: { right: 100, bottom: 100 }
    })
    setWallet(wallet)
    const handleChainChanged = (chainId: HibitIdChainId) => setChainId(chainId)
    wallet.addEventListener('chainChanged', handleChainChanged)
    const handleBalanceChanged = (data: BalanceChangeData) => {
      console.log(data)
    }
    wallet.subscribeBalanceChange({
      assetType: HibitIdAssetType.ERC20,
      chainId: HibitIdChainId.EthereumBscTestnet,
      contractAddress: '0x4becfca57c5728536fc4746645f7b4410d1cc5f7',
      decimalPlaces: 18
    }, handleBalanceChanged)

    return () => {
      wallet.removeEventListener('chainChanged', handleChainChanged)
      wallet.unsubscribeBalanceChange({
        assetType: HibitIdAssetType.ERC20,
        chainId: HibitIdChainId.EthereumBscTestnet,
        contractAddress: '0x4becfca57c5728536fc4746645f7b4410d1cc5f7',
        decimalPlaces: 18
      }, handleBalanceChanged)
    }
  }, [])

  return (
    <div className="p-4 flex gap-4">
      <div>
        <button className="btn btn-sm" onClick={async () => {
          setConnecting(true)
          const account = await wallet?.connect(HibitIdChainId.EthereumSepolia)
          setAccount(account ?? null)
          setConnecting(false)
        }}>
          {connecting ? 'loading...' : 'connect'}
        </button>
      </div>
      <div>
        <p>account:</p>
        <pre>{JSON.stringify(account, null, 2)}</pre>
      </div>
      <div>
        <button className="btn btn-sm" onClick={async () => {
          await wallet?.showResetPassword()
        }}>
          reset password
        </button>
      </div>
      <div>
        <button className="btn btn-sm" onClick={async () => {
          try {
            await wallet?.verifyPassword({ password: '123456' })
            alert('password verified')
          } catch (e: any) {
            alert(e.message || e)
          }
        }}>
          verify password
        </button>
      </div>
      <div>
        <button className="btn btn-sm" onClick={async () => {
          await wallet?.setBackgroundEmbed(!isBackgroundEmbed)
          setIsBackgroundEmbed(!isBackgroundEmbed)
        }}>
          toggle background embed({isBackgroundEmbed})
        </button>
      </div>
      <div>
        <button className="btn btn-sm" onClick={async () => {
          const balance = await wallet?.getBalance()
          setBalance(balance ?? '')
          setTimeout(() => {
            setBalance('')
          }, 1000)
        }}>
          get balance
        </button>
        <p>balance: {balance}</p>
      </div>
      <div>
        <button className="btn btn-sm" onClick={async () => {
          const sig = await wallet?.signMessage('hello hibit')
          setSig(sig ?? '')
          setTimeout(() => {
            setSig('')
          }, 1000)
        }}
        >sign message</button>
        <p>signature: {sig}</p>
      </div>
      <div>
        <p>switch chain: {chainId}</p>
        <button onClick={() => {
          wallet?.switchToChain(HibitIdChainId.EthereumSepolia)
        }}>
          evm sepolia
        </button>
        <button onClick={() => {
          wallet?.switchToChain(HibitIdChainId.TonTestnet)
        }}>
          ton testnet
        </button>
      </div>
    </div>
  )
}

export default App
