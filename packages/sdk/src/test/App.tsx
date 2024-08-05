import { FC, useEffect, useState } from "react";
import { HibitIdWallet } from "../lib/wallet";
import { HibitIdChainId, WalletAccount } from "../lib";

const App: FC = () => {
  const [wallet, setWallet] = useState<HibitIdWallet | null>(null)
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [sig, setSig] = useState('')
  const [balance, setBalance] = useState('')
  const [chainId, setChainId] = useState('')

  useEffect(() => {
    const wallet = new HibitIdWallet('dev')
    setWallet(wallet)
    const handleChainChanged = (chainId: HibitIdChainId) => setChainId(chainId)
    wallet.addEventListener('chainChanged', handleChainChanged)

    return () => {
      wallet.removeEventListener('chainChanged', handleChainChanged)
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
