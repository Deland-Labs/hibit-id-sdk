import { FC, useEffect, useState } from "react";
import { HibitIdWallet } from "../lib/wallet";
import { WalletAccount } from "../lib";

const App: FC = () => {
  const [wallet, setWallet] = useState<HibitIdWallet | null>(null)
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [sig, setSig] = useState('')
  const [balance, setBalance] = useState('')

  useEffect(() => {
    const wallet = new HibitIdWallet('dev')
    setWallet(wallet)
  }, [])

  return (
    <div className="p-4 flex gap-4">
      <div>
        <button className="btn btn-sm" onClick={async () => {
          setConnecting(true)
          const account = await wallet?.connect(() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve()
              }, 2000)
            })
          })
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
        }}>
          get balance
        </button>
        <p>balance: {balance}</p>
      </div>
      <div>
        <button className="btn btn-sm" onClick={async () => {
          const sig = await wallet?.signMessage('hello hibit')
          setSig(sig ?? '')
        }}
        >sign message</button>
        <p>signature: {sig}</p>
      </div>
    </div>
  )
}

export default App
