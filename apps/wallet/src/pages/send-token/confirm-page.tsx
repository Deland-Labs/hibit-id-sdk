import { observer } from "mobx-react";
import { FC, useEffect, useMemo, useState } from "react";
import hibitIdSession from "../../stores/session";
import { useNavigate } from "react-router-dom";
import SvgLoading from '../../assets/transfer-loading.svg?react';
import SvgSuccess from '../../assets/transfer-success.svg?react';
import SvgExternal from '../../assets/external.svg?react';
import { useTokenBalanceQuery, useTokenQuery } from "../../apis/react-query/token";
import BigNumber from "bignumber.js";
import toaster from "../../components/Toaster";
import { useMutation, useQuery } from "@tanstack/react-query";
import CopyButton from "../../components/CopyButton";
import { sendTokenStore } from "./store";
import { formatNumber } from "../../utils/formatter";
import { ChainAssetType } from "../../utils/basicTypes";
import { getChainTxLink } from "../../utils/link";
import PageHeader from "../../components/PageHeader";

const SendTokenConfirmPage: FC = observer(() => {
  const [errMsg, setErrMsg] = useState<string>('')
  const [transferResult, setTransferResult] = useState<{
    state: 'pending' | 'done',
    txId: string
  }>({
    state: 'pending',
    txId: ''
  })
  const navigate = useNavigate()
  
  const { state } = sendTokenStore
  const nativeTokenQuery = useTokenQuery(hibitIdSession.chainInfo.nativeAssetSymbol)
  const nativeBalanceQuery = useTokenBalanceQuery(nativeTokenQuery.data || undefined)
  const feeQuery = useQuery({
    queryKey: ['estimatedFee', state],
    queryFn: async () => {
      if (!hibitIdSession.walletPool || !state.token) {
        return null
      }
      return await hibitIdSession.walletPool.getEstimatedFee(
        state.toAddress,
        new BigNumber(state.amount),
        state.token,
      )
    },
    refetchInterval: 5000,
  })

  const minNativeBalance = useMemo(() => {
    if (!feeQuery.data || !state.token) {
      return null
    }
    if (state.token.chainAssetType.equals(ChainAssetType.Native)) {
      return new BigNumber(state.amount).plus(feeQuery.data)
    } else {
      return feeQuery.data
    }
  }, [state, feeQuery.data])

  useEffect(() => {
    if (!nativeBalanceQuery.data || !minNativeBalance) {
      return
    }
    if (nativeBalanceQuery.data.lt(minNativeBalance)) {
      setErrMsg(`Insufficient gas in your wallet (at least ${formatNumber(minNativeBalance)} ${nativeTokenQuery.data?.assetSymbol})`)
    } else {
      setErrMsg('')
    }
  }, [nativeBalanceQuery.data, feeQuery.data, nativeTokenQuery.data])

  const transferMutation = useMutation({
    mutationFn: async ({ address, amount }: {
      address: string
      amount: string
    }) => {
      if (!hibitIdSession.walletPool || !state.token) {
        throw new Error('Wallet or token not ready')
      }
      return await hibitIdSession.walletPool.transfer(
        address,
        new BigNumber(amount),
        state.token
      )
    }
  })

  const handleSend = async () => {
    if (!hibitIdSession.walletPool || !state.token || errMsg) {
      return
    }
    try {
      const txId = await transferMutation.mutateAsync({
        address: state.toAddress,
        amount: state.amount,
      })
      console.debug('[txId]', txId)
      setTransferResult({ state: 'done', txId })
      sendTokenStore.reset()
    } catch (e) {
      console.error(e)
      setTransferResult({ state: 'pending', txId: '' })
      toaster.error(e instanceof Error ? e.message : JSON.stringify(e))
    }
  }

  if (transferMutation.isPending) {
    return (
      <div className="h-full px-6 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <SvgLoading />
          <span>Await confirmation</span>
        </div>
      </div>
    )
  }

  if (transferResult.state === 'done') {
    const txLink = getChainTxLink(hibitIdSession.chainInfo.chainId, transferResult.txId)

    return (
      <div className="h-full px-6 flex flex-col overflow-auto">
        <div className="flex-1 flex flex-col gap-8 justify-center items-center">
          <SvgSuccess />
          <span className="text-success">Transaction finished</span>
          {txLink && (
            <a className="flex items-center gap-2" href={txLink} target="_blank" rel="noreferrer">
              <span>view in explorer</span>
              <SvgExternal />
            </a>
          )}
        </div>
        <button className="btn btn-sm" onClick={() => {
          navigate('/')
        }}>
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="h-full px-6 flex flex-col gap-6 overflow-auto">
      <PageHeader title="Edit" />
      <div className="flex-1 flex flex-col gap-6">
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-xs">To</span>
            </div>
            <div className="max-w-full p-2 pr-1 flex items-center gap-2 bg-base-100 rounded-xl text-primary">
              <span className="text-xs break-all">{state.toAddress}</span>
              <CopyButton copyText={state.toAddress} />
            </div>
          </label>
        </div>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-xs">Amount</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-primary">{formatNumber(state.amount)}</span>
              <span>{state.token?.assetSymbol}</span>
            </div>
          </label>
        </div>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-xs">Network fee estimation</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-primary">
                {!feeQuery.isFetching ? (
                  <span>~{formatNumber(feeQuery.data)}</span>
                ) : (
                  <span className="loading loading-spinner size-4" />
                )}
              </span>
              <span>{nativeTokenQuery.data?.assetSymbol}</span>
            </div>
            {errMsg && (
              <div className="label">
                <span className="label-text-alt text-error">{errMsg}</span>
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn btn-sm flex-1">
          Cancel
        </button>
        <button
          className="btn btn-sm btn-primary flex-1 disabled:opacity-70"
          onClick={handleSend}
          disabled={!!errMsg || feeQuery.isFetching || !nativeBalanceQuery.data}
        >
          Confirm
        </button>
      </div>
    </div>
  )
})

export default SendTokenConfirmPage
