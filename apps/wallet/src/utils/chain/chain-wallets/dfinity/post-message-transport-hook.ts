import { useCallback, useEffect } from "react"
import { Icrc25PermissionsResult, Icrc25RequestPermissionsRequest, Icrc25RequestPermissionsResult, Icrc25SupportedStandardsResult, Icrc27AccountsResult, Icrc29StatusResult, Icrc32SignChallengeRequest, Icrc32SignChallengeResult, Icrc49CallCanisterRequest, IcrcErrorCode, IcrcErrorCodeMessages, IcrcMethods, IcrcPermissionState, JsonRpcRequest } from "./types"
import { buildJsonRpcError, buildJsonRpcResponse, getIcrc29Session, NEED_PERMISSION_METHODS, parseJsonRpcRequest, setIcrc29Session, SUPPORTED_STANDARDS } from "./utils"
import hibitIdSession from "../../../../stores/session"
import { Dfinity } from "../../chain-list"
import { DfinityChainWallet } from "."
import { RUNTIME_ENV } from "../../../runtime"
import { RuntimeEnv } from "../../../basicEnums"

const ICRC_CHAIN_ID = Dfinity.chainId

export const useDfinityIcrcPostMessageTransport = (isReady: boolean) => {
  const handleMessage = useCallback(async (event: MessageEvent) => {
    let request: JsonRpcRequest | null = null
    try {
      request = parseJsonRpcRequest(event.data)
    } catch (e) {
      console.warn('Failed to parse JsonRpcRequest, ignored')
    }
    if (!request) return
    console.debug(`Received ICRC request: ${JSON.stringify(request, undefined, 2)}`)

    if (request.method === IcrcMethods.ICRC29_STATUS) {
      if (!isReady) {
        console.debug('ICRC29 not ready yet, ignored')
        return
      }
      event.source?.postMessage(
        buildJsonRpcResponse(request.id, 'ready' as Icrc29StatusResult),
        { targetOrigin: event.origin },
      )
      setIcrc29Session(event.origin, {})
      return
    }

    const session = getIcrc29Session()
    if (!session) {
      console.debug('ICRC29 session not found, ignored')
      return
    }

    if (request.method === IcrcMethods.ICRC25_REQUEST_PERMISSIONS) {
      const currentPermissions = { ...session.permissions }
      ;(request as Icrc25RequestPermissionsRequest).params.scopes.forEach((scope) => {
        if (currentPermissions[scope.method] === IcrcPermissionState.GRANTED) return
        if (NEED_PERMISSION_METHODS.includes(scope.method)) {
          currentPermissions[scope.method] = IcrcPermissionState.GRANTED
        }
      })
      event.source?.postMessage(
        buildJsonRpcResponse<Icrc25RequestPermissionsResult>(request.id, {
          scopes: Object.keys(currentPermissions).map((method) => ({
            scope: {
              method: method as IcrcMethods,
            },
            state: currentPermissions[method as IcrcMethods] ?? IcrcPermissionState.DENIED,
          }))
        }),
        { targetOrigin: event.origin },
      )
      setIcrc29Session(event.origin, currentPermissions)
      return
    }

    if (request.method === IcrcMethods.ICRC25_PERMISSIONS) {
      const currentPermissions = { ...session.permissions }
      event.source?.postMessage(
        buildJsonRpcResponse<Icrc25PermissionsResult>(request.id, {
          scopes: Object.keys(currentPermissions).map((method) => ({
            scope: {
              method: method as IcrcMethods,
            },
            state: currentPermissions[method as IcrcMethods] ?? IcrcPermissionState.DENIED,
          }))
        }),
        { targetOrigin: event.origin },
      )
      return
    }

    if (request.method === IcrcMethods.ICRC25_SUPPORTED_STANDARDS) {
      event.source?.postMessage(
        buildJsonRpcResponse<Icrc25SupportedStandardsResult>(request.id, {
          supportedStandards: SUPPORTED_STANDARDS
        }),
        { targetOrigin: event.origin },
      )
      return
    }

    if (request.method === IcrcMethods.ICRC27_ACCOUNTS) {
      if (!hibitIdSession.walletPool || session.permissions[IcrcMethods.ICRC27_ACCOUNTS] !== IcrcPermissionState.GRANTED) {
        event.source?.postMessage(
          buildJsonRpcError(request.id, IcrcErrorCode.PermissionNotGranted, IcrcErrorCodeMessages[IcrcErrorCode.PermissionNotGranted]),
          { targetOrigin: event.origin },
        )
        return
      }
      try {
        const account = await hibitIdSession.walletPool.getAccount(ICRC_CHAIN_ID)
        event.source?.postMessage(
          buildJsonRpcResponse<Icrc27AccountsResult>(request.id, {
            accounts: [
              {
                owner: account.address,
              }
            ],
          }),
          { targetOrigin: event.origin },
        )
      } catch (e: any) {
        event.source?.postMessage(
          buildJsonRpcError(
            request.id,
            IcrcErrorCode.GenericError,
            IcrcErrorCodeMessages[IcrcErrorCode.GenericError],
            e.message ?? JSON.stringify(e),
          ),
          { targetOrigin: event.origin },
        )
      }
      return
    }

    if (request.method === IcrcMethods.ICRC32_SIGN_CHALLENGE) {
      if (!hibitIdSession.walletPool || session.permissions[IcrcMethods.ICRC32_SIGN_CHALLENGE] !== IcrcPermissionState.GRANTED) {
        event.source?.postMessage(
          buildJsonRpcError(request.id, IcrcErrorCode.PermissionNotGranted, IcrcErrorCodeMessages[IcrcErrorCode.PermissionNotGranted]),
          { targetOrigin: event.origin },
        )
        return
      }
      try {
        const account = await hibitIdSession.walletPool.getAccount(ICRC_CHAIN_ID)
        const req = request as Icrc32SignChallengeRequest
        if (account.address !== req.params.principal) {
          event.source?.postMessage(
            buildJsonRpcError(request.id, IcrcErrorCode.GenericError, IcrcErrorCodeMessages[IcrcErrorCode.GenericError], 'Principal does not match account'),
            { targetOrigin: event.origin },
          )
          return
        }
        const signature = await hibitIdSession.walletPool.signMessage(req.params.challenge, ICRC_CHAIN_ID)
        event.source?.postMessage(
          buildJsonRpcResponse<Icrc32SignChallengeResult>(request.id, {
            publicKey: account.publicKey!,
            signature,
          }),
          { targetOrigin: event.origin },
        )
      } catch (e: any) {
        event.source?.postMessage(
          buildJsonRpcError(
            request.id,
            IcrcErrorCode.GenericError,
            IcrcErrorCodeMessages[IcrcErrorCode.GenericError],
            e.message ?? JSON.stringify(e),
          ),
          { targetOrigin: event.origin },
        )
      }
      return
    }

    if (request.method === IcrcMethods.ICRC49_CALL_CANISTER) {
      if (!hibitIdSession.walletPool || session.permissions[IcrcMethods.ICRC49_CALL_CANISTER] !== IcrcPermissionState.GRANTED) {
        event.source?.postMessage(
          buildJsonRpcError(request.id, IcrcErrorCode.PermissionNotGranted, IcrcErrorCodeMessages[IcrcErrorCode.PermissionNotGranted]),
          { targetOrigin: event.origin },
        )
        return
      }
      try {
        const wallet = hibitIdSession.walletPool.get(ICRC_CHAIN_ID) as DfinityChainWallet
        const req = request as Icrc49CallCanisterRequest
        const res = await wallet.Icrc49CallCanister(req)
        event.source?.postMessage(res, { targetOrigin: event.origin })
      } catch (e: any) {
        event.source?.postMessage(
          buildJsonRpcError(
            request.id,
            IcrcErrorCode.GenericError,
            IcrcErrorCodeMessages[IcrcErrorCode.GenericError],
            e.message ?? JSON.stringify(e),
          ),
          { targetOrigin: event.origin },
        )
      }
      return
    }
  }, [isReady, hibitIdSession.walletPool])

  useEffect(() => {
    if (RUNTIME_ENV !== RuntimeEnv.ICRC_POSTMESSAGE) {
      return
    }
    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [handleMessage])
}
