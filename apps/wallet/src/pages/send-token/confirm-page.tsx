import { observer } from "mobx-react";
import { FC, useEffect, useState } from "react";
import hibitIdSession from "../../stores/session";
import { useNavigate } from "react-router-dom";
import SvgLoading from '../../assets/transfer-loading.svg?react';
import SvgSuccess from '../../assets/transfer-success.svg?react';
import SvgExternal from '../../assets/external.svg?react';
import { useTokenBalanceQuery, useTokenListQuery } from "../../apis/react-query/token";
import BigNumber from "bignumber.js";
import toaster from "../../components/Toaster";
import { useMutation, useQuery } from "@tanstack/react-query";
import CopyButton from "../../components/CopyButton";
import { sendTokenStore, useFeeQuery } from "./store";
import { formatNumber } from "../../utils/formatter";
import { Chain, ChainAssetType } from "../../utils/basicTypes";
import { getChainTxLink } from "../../utils/link";
import PageHeader from "../../components/PageHeader";
import { useTranslation } from "react-i18next";

const SendTokenConfirmPage: FC = observer(() => {
  const [errMsg, setErrMsg] = useState<string>('')
  const [resultTxId, setResultTxId] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  const { state } = sendTokenStore
  const tokenListQuery = useTokenListQuery(hibitIdSession.chainInfo)
  const nativeTokenQuery = useQuery({
    queryKey: ['nativeToken', hibitIdSession.chainInfo],
    queryFn: async () => {
      return tokenListQuery.data!.find(t => t.chainAssetType.equals(ChainAssetType.Native))
    },
    enabled: !!tokenListQuery.data
  })
  const nativeBalanceQuery = useTokenBalanceQuery(nativeTokenQuery.data || undefined)
  const balanceQuery = useTokenBalanceQuery(state.token || undefined)
  const feeQuery = useFeeQuery(state.toAddress, state.amount, state.token)

  useEffect(() => {
    if (hibitIdSession.chainInfo.isNativeFee) {
      // native fee
      if (!nativeBalanceQuery.data || !feeQuery.data || !state.token) {
        return
      }
      let minNativeBalance = new BigNumber(0)
      if (state.token.chainAssetType.equals(ChainAssetType.Native)) {
        minNativeBalance = new BigNumber(state.amount).plus(feeQuery.data)
      } else {
        minNativeBalance = feeQuery.data
      }
      console.debug('[minNativeBalance]', minNativeBalance.toString())
      if (nativeBalanceQuery.data.lt(minNativeBalance)) {
        setErrMsg(t('page_send_errInsufficientGas', {
          atLeast: `${formatNumber(minNativeBalance)} ${nativeTokenQuery.data?.assetSymbol}`,
        }))
      }
      return
    } else {
      // token fee
      if (!balanceQuery.data || !feeQuery.data || !state.token) {
        return
      }
      const minTokenBalance = new BigNumber(state.amount).plus(feeQuery.data)
      console.debug('[minTokenBalance]', minTokenBalance.toString())
      if (balanceQuery.data.lt(minTokenBalance)) {
        setErrMsg(t('page_send_errInsufficientGas', {
          atLeast: `${formatNumber(minTokenBalance)} ${state.token.assetSymbol}`,
        }))
      }
      return
    }
  }, [nativeBalanceQuery.data, balanceQuery.data, hibitIdSession.chainInfo, feeQuery.data, nativeTokenQuery.data, state])

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
      setResultTxId(txId)
      sendTokenStore.reset()
    } catch (e) {
      console.error(e)
      setResultTxId('')
      toaster.error(e instanceof Error ? e.message : JSON.stringify(e))
    }
  }

  if (transferMutation.isPending) {
    return (
      <div className="h-full px-6 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <SvgLoading />
          <span>{t('page_send_awaitConfirmation')}</span>
        </div>
      </div>
    )
  }

  if (transferMutation.isSuccess) {
    const txLink = getChainTxLink(hibitIdSession.chainInfo.chainId, resultTxId)
    return (
      <div className="h-full px-6 flex flex-col overflow-auto">
        <div className="flex-1 flex flex-col gap-8 justify-center items-center">
          <SvgSuccess />
          <span className="text-success">{t('page_send_finished')}</span>
          {/* hide link for Dfinity */}
          {txLink && !hibitIdSession.chainInfo.chainId.type.equals(Chain.Dfinity) && (
            <a className="flex items-center gap-2" href={txLink} target="_blank" rel="noreferrer">
              <span>{t('page_send_viewExplorer')}</span>
              <SvgExternal />
            </a>
          )}
        </div>
        <button className="btn btn-sm" onClick={() => {
          navigate('/')
        }}>
          {t('common_close')}
        </button>
      </div>
    )
  }

  return (
    <div className="h-full px-6 flex flex-col gap-6 overflow-auto">
      <PageHeader title={t('common_edit')} />
      <div className="flex-1 flex flex-col gap-6">
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">
                {t('page_send_field_sendTo')}
              </span>
            </div>
            <div className="max-w-full p-2 pr-1 flex items-center gap-2 bg-base-100 rounded-xl text-primary">
              <span className="text-xs font-bold break-all">{state.toAddress}</span>
              <CopyButton copyText={state.toAddress} />
            </div>
          </label>
        </div>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">
                {t('page_send_field_amount')}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-primary text-sm">{formatNumber(state.amount)}</span>
              <span className="text-xs">{state.token?.assetSymbol}</span>
            </div>
          </label>
        </div>
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text text-neutral text-sm font-bold">
                {t('page_send_field_fee')}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-primary text-sm">
                {!feeQuery.isLoading ? (
                  <span className="flex items-center gap-2">
                    <span>~{formatNumber(feeQuery.data)}</span>
                  </span>
                ) : (
                  <span className="loading loading-spinner size-4" />
                )}
              </span>
              <span className="text-xs">
                {hibitIdSession.chainInfo.isNativeFee
                  ? nativeTokenQuery.data?.assetSymbol
                  : state.token?.assetSymbol
                }
              </span>
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
        <button className="btn btn-sm flex-1" onClick={() => navigate(-1)}>
          {t('common_cancel')}
        </button>
        <button
          className="btn btn-sm btn-primary flex-1 disabled:opacity-70"
          onClick={handleSend}
          disabled={!!errMsg || feeQuery.isPending || nativeBalanceQuery.isLoading || balanceQuery.isLoading}
        >
          {t('common_confirm')}
        </button>
      </div>
    </div>
  )
})

export default SendTokenConfirmPage
