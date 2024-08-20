import { observer } from "mobx-react";
import { FC, useEffect, useMemo, useState } from "react";
import hibitIdSession from "../../stores/session";
import { useNavigate, useParams } from "react-router-dom";
import { useTokenBalanceQuery, useTokenQuery } from "../../apis/react-query/token";
import TokenSelect from "../../components/TokenSelect";
import { RootAssetInfo } from "../../apis/models";
import BigNumber from "bignumber.js";
import { formatNumber } from "../../utils/formatter";
import LoaderButton from "../../components/LoaderButton";
import { object, string } from "yup";
import { walletAddressValidate } from "../../utils/validator";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import { SYSTEM_MAX_DECIMALS } from "../../utils/formatter/numberFormatter";
import { sendTokenStore } from "./store";
import PageHeader from "../../components/PageHeader";

const SendTokenPage: FC = observer(() => {
  const { addressOrSymbol } = useParams()
  const [token, setToken] = useState<RootAssetInfo | null>(null)
  const { state, setState } = sendTokenStore
  const navigate = useNavigate()
  
  const tokenQuery = useTokenQuery(addressOrSymbol ?? '')
  const balanceQuery = useTokenBalanceQuery(token || undefined)

  const formSchema = useMemo(() => {
    return object({
      toAddress: string()
        .required('Address is required')
        .test('address', 'Invalid address', (value) => {
          if (!token) return true
          return walletAddressValidate(token.chain, value)
        }),
      amount: string()
        .required('Amount is required')
        .test({
          message: 'Amount must be greater than 0',
          test: (value) => {
            return !!value && new BigNumber(value).gt(0)
          },
        })
        .test({
          message: 'Insufficient balance',
          test: (value) => {
            if (!balanceQuery.data) return true
            return !!value && new BigNumber(value).lte(balanceQuery.data)
          },
        })
    })
  }, [token, balanceQuery.data])

  const {
    setValue,
    trigger,
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      toAddress: state.toAddress || '',
      amount: state.amount || '',
    },
    resolver: yupResolver(formSchema),
    mode: 'onChange'
  })

  useEffect(() => {
    if (tokenQuery.data) {
      setToken(tokenQuery.data)
    }
  }, [tokenQuery.data])

  const handleSend = handleSubmit(async ({ toAddress, amount }) => {
    if (!hibitIdSession.walletPool || !token) {
      return
    }
    setState({
      toAddress,
      token,
      amount
    })
    navigate('/send/confirm')
  })

  return (
    <div className="h-full px-6 flex flex-col gap-6 overflow-auto">
      <PageHeader title="Send" />
      <div className="flex-1 flex flex-col gap-6">
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">Send to</span>
            </div>
            <textarea
              placeholder="Recipient address"
              className="textarea w-full h-16 text-xs"
              {...register('toAddress')}
            />
            {errors.toAddress && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.toAddress.message}</span>
              </div>
            )}
          </label>
        </div>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">Amount</span>
              <span className="label-text-alt text-xs">
                <button
                  className="btn btn-link btn-xs px-0 no-underline gap-0"
                  onClick={() => {
                    setValue('amount', balanceQuery.data?.toString() ?? '0')
                  }}
                >
                  Max:
                  {balanceQuery.isLoading && (
                    <span className="loading loading-spinner loading-xs"></span>
                  )}
                  {balanceQuery.data && (
                    <span className="mx-1">{formatNumber(balanceQuery.data || 0)}</span>
                  )}
                  {token?.assetSymbol}
                </button>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TokenSelect
                value={token}
                onChange={(val) => {
                  setToken(val)
                  setTimeout(() => {
                    setValue('amount', '')
                    trigger('amount')
                  })
                }}
              />
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    className="input input-sm w-full text-xs"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value
                      const [, decimals] = value.split('.')
                      if (decimals?.length > Math.min(SYSTEM_MAX_DECIMALS, token?.decimalPlaces.value ?? Infinity)) {
                        return
                      }
                      setValue('amount', value)
                      trigger('amount')
                    }}
                  />
                )}
              />
            </div>
            {errors.amount && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.amount.message}</span>
              </div>
            )}
          </label>
        </div>
      </div>

      <LoaderButton
        className="btn btn-block btn-sm disabled:opacity-70"
        onClick={handleSend}
      >
        Send
      </LoaderButton>
    </div>
  )
})

export default SendTokenPage
