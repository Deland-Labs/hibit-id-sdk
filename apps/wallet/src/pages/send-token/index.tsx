import { observer } from "mobx-react";
import { FC, useEffect, useState } from "react";
import hibitIdSession from "../../stores/session";
import { JsonRpcProvider, parseEther } from "ethers";
import { SEPOLIA_RPC } from "../../utils/constants";
import { useNavigate, useParams } from "react-router-dom";
import SvgGo from '../../assets/go.svg?react';
import { useTokenQuery } from "../../apis/react-query/token";
import TokenSelect from "../../components/TokenSelect";
import { RootAssetInfo } from "../../apis/models";

const SendTokenPage: FC = observer(() => {
  const { addressOrSymbol } = useParams()
  const [token, setToken] = useState<RootAssetInfo | null>(null)
  const [toAddress, setToAddress] = useState('')
  const [addressError, setAddressError] = useState('')
  const [amount, setAmount] = useState('0')
  const [amountError, setAmountError] = useState('')
  const navigate = useNavigate()

  const tokenQuery = useTokenQuery(addressOrSymbol ?? '')

  useEffect(() => {
    if (tokenQuery.data) {
      setToken(tokenQuery.data)
    }
  }, [tokenQuery.data])

  const handleSend = async () => {
    setAmountError('')
    if (!hibitIdSession.wallet) {
      return
    }
    try {
      const provider = new JsonRpcProvider(SEPOLIA_RPC, 0xaa36a7)
      hibitIdSession.wallet = hibitIdSession.wallet.connect(provider)
      const res = await hibitIdSession.wallet.sendTransaction({
        to: toAddress,
        value: parseEther(amount)
      })
      alert(`Transaction sent: ${res.hash}`)
    } catch (e) {
      setAmountError(JSON.stringify(e, null, 2))
    }
  }

  return (
    <div className="h-full relative">
      <div>
        <button className="btn btn-ghost btn-sm gap-2 items-center pl-0" onClick={() => navigate(-1)}>
          <SvgGo className="size-6 rotate-180" />
          <span className="text-xs">Send</span>
        </button>
      </div>
      <div className="mt-6">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-neutral text-xs">Send to</span>
          </div>
          <textarea
            placeholder="Recipient address"
            className="textarea w-full h-16 text-xs"
            value={toAddress}
            onChange={e => {
              // TODO: address validation
              if (!e.target.value) {
                setAddressError('Address is required')
              }
              setToAddress(e.target.value)
            }}
          />
          {addressError && (
            <div className="label">
              <span className="label-text-alt text-error">{addressError}</span>
            </div>
          )}
        </label>
      </div>
      <div className="mt-6">
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text text-neutral text-xs">Amount</span>
            <span className="label-text-alt text-xs">
              <button className="btn btn-link btn-xs">{`Max: 0 ETH`}</button>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TokenSelect value={token} onChange={(val) => setToken(val)} />
            <input
              type="number"
              min={0}
              className="input input-sm w-full text-xs"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          {amountError && (
            <div className="label">
              <span className="label-text-alt text-error">{amountError}</span>
            </div>
          )}
        </label>
      </div>

      <button
        className="btn btn-block btn-sm absolute bottom-0"
        onClick={handleSend}
        disabled={!!addressError || !!amountError || !toAddress || Number(amount) === 0}
      >
        Send
      </button>
    </div>
  )
})

export default SendTokenPage
