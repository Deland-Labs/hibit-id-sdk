import { useEffect, useRef } from "react"
import { Icrc25PermissionsResult, Icrc25RequestPermissionsRequest, Icrc25RequestPermissionsResult, Icrc25SupportedStandardsResult, Icrc27AccountsResult, Icrc29StatusResult, Icrc32SignChallengeRequest, Icrc32SignChallengeResult, IcrcErrorCode, IcrcErrorCodeMessages, IcrcMethods, IcrcPermissionState, JsonRpcRequest } from "./types"
import { buildJsonRpcError, buildJsonRpcResponse, getIcrc29Session, NEED_PERMISSION_METHODS, parseJsonRpcRequest, setIcrc29Session, SUPPORTED_STANDARDS } from "./utils"
import hibitIdSession from "../../../../../stores/session"
import { Dfinity } from "../../../chain-list"

const ICRC_CHAIN_ID = Dfinity.chainId

export const useDfinityIcrcPostMessageTransport = (isReady: boolean) => {
  const handleMessageRef = useRef<(event: MessageEvent) => Promise<void>>(async (event) => {
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
      window.postMessage(
        buildJsonRpcResponse(request.id, 'ready' as Icrc29StatusResult),
        event.origin,
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
      window.postMessage(
        buildJsonRpcResponse<Icrc25RequestPermissionsResult>(request.id, {
          scopes: Object.keys(currentPermissions).map((method) => ({
            scope: {
              method: method as IcrcMethods,
            },
            state: currentPermissions[method as IcrcMethods] ?? IcrcPermissionState.DENIED,
          }))
        }),
        event.origin,
      )
      setIcrc29Session(event.origin, currentPermissions)
      return
    }

    if (request.method === IcrcMethods.ICRC25_PERMISSIONS) {
      const currentPermissions = { ...session.permissions }
      window.postMessage(
        buildJsonRpcResponse<Icrc25PermissionsResult>(request.id, {
          scopes: Object.keys(currentPermissions).map((method) => ({
            scope: {
              method: method as IcrcMethods,
            },
            state: currentPermissions[method as IcrcMethods] ?? IcrcPermissionState.DENIED,
          }))
        }),
        event.origin,
      )
      return
    }

    if (request.method === IcrcMethods.ICRC25_SUPPORTED_STANDARDS) {
      window.postMessage(
        buildJsonRpcResponse<Icrc25SupportedStandardsResult>(request.id, {
          supportedStandards: SUPPORTED_STANDARDS
        }),
        event.origin,
      )
      return
    }

    if (request.method === IcrcMethods.ICRC27_ACCOUNTS) {
      if (!hibitIdSession.walletPool || session.permissions[IcrcMethods.ICRC27_ACCOUNTS] !== IcrcPermissionState.GRANTED) {
        window.postMessage(
          buildJsonRpcError(request.id, IcrcErrorCode.PermissionNotGranted, IcrcErrorCodeMessages[IcrcErrorCode.PermissionNotGranted]),
          event.origin,
        )
        return
      }
      try {
        const account = await hibitIdSession.walletPool.getAccount(ICRC_CHAIN_ID)
        window.postMessage(
          buildJsonRpcResponse<Icrc27AccountsResult>(request.id, {
            accounts: [
              {
                owner: account.address,
              }
            ],
          }),
          event.origin,
        )
      } catch (e: any) {
        window.postMessage(
          buildJsonRpcError(
            request.id,
            IcrcErrorCode.GenericError,
            IcrcErrorCodeMessages[IcrcErrorCode.GenericError],
            e.message ?? JSON.stringify(e),
          ),
          event.origin,
        )
      }
      return
    }

    if (request.method === IcrcMethods.ICRC32_SIGN_CHALLENGE) {
      if (!hibitIdSession.walletPool || session.permissions[IcrcMethods.ICRC32_SIGN_CHALLENGE] !== IcrcPermissionState.GRANTED) {
        window.postMessage(
          buildJsonRpcError(request.id, IcrcErrorCode.PermissionNotGranted, IcrcErrorCodeMessages[IcrcErrorCode.PermissionNotGranted]),
          event.origin,
        )
        return
      }
      try {
        const account = await hibitIdSession.walletPool.getAccount(ICRC_CHAIN_ID)
        const req = request as Icrc32SignChallengeRequest
        if (account.address !== req.params.principal) {
          window.postMessage(
            buildJsonRpcError(request.id, IcrcErrorCode.GenericError, IcrcErrorCodeMessages[IcrcErrorCode.GenericError], 'Principal does not match account'),
            event.origin,
          )
          return
        }
        const signature = await hibitIdSession.walletPool.signMessage(req.params.challenge, ICRC_CHAIN_ID)
        window.postMessage(
          buildJsonRpcResponse<Icrc32SignChallengeResult>(request.id, {
            publicKey: account.publicKey!,
            signature,
          }),
          event.origin,
        )
      } catch (e: any) {
        window.postMessage(
          buildJsonRpcError(
            request.id,
            IcrcErrorCode.GenericError,
            IcrcErrorCodeMessages[IcrcErrorCode.GenericError],
            e.message ?? JSON.stringify(e),
          ),
          event.origin,
        )
      }
      return
    }

    if (request.method === IcrcMethods.ICRC49_CALL_CANISTER) {
      // TODO:
    }
  })

  useEffect(() => {
    const handleMessage = handleMessageRef.current
    window.addEventListener("message", handleMessage)
    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [])
}
