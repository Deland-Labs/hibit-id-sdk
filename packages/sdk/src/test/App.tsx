import { FC, useEffect, useState } from "react";
import { HibitWallet } from "../lib/wallet";

const App: FC = () => {
  const [pw, setPw] = useState<HibitWallet | null>(null)
  const [ex3Account, setEx3Account] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [sig, setSig] = useState('')

  useEffect(() => {
    const pw = new HibitWallet('dev')
    setPw(pw)
  }, [])

  return (
    <div className="p-4 flex gap-4">
      <div>
        <button className="btn btn-sm" onClick={async () => {
          setConnecting(true)
          const account = await pw?.connect()
          setEx3Account(JSON.stringify(account, null, 2))
          setConnecting(false)
        }}>
          {connecting ? 'loading...' : 'connect'}
        </button>
      </div>
      <div>
        <p>ex3 account:</p>
        <pre>{ex3Account}</pre>
      </div>
      <div>
        <button className="btn btn-sm" onClick={async () => {
          const sig = await pw?.signMessage('hello hibit')
          setSig(sig ?? '')
        }}
        >sign message</button>
        <p>signature: {sig}</p>
      </div>
    </div>
  )
}

export default App
