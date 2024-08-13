import { FC, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import hibitIdSession from './stores/session';
import { twMerge } from 'tailwind-merge'
import { useIsDesktop } from './utils/hooks';
import PageLoading from './components/PageLoading';
import { useOidc } from './utils/oidc';
import { IS_TELEGRAM_MINI_APP, RUNTIME_ENV, RUNTIME_PARAMS_RAW } from './utils/runtime';
import { HibitEnv, RuntimeEnv } from './utils/basicEnums';
import { AuthenticatorType } from '@deland-labs/hibit-id-sdk';
import authManager from './utils/auth';
import toaster from './components/Toaster';
import rpcManager from './stores/rpc';
import VConsole from 'vconsole';
import { HIBIT_ENV } from './utils/env';

const MainPage = lazy(() => import('./pages/main'));
const SelectNetworkPage = lazy(() => import('./pages/select-network'));
const LoginPage = lazy(() => import('./pages/login'));
const OidcLoginPage = lazy(() => import('./pages/oidc-login'));
const TokenDetailPage = lazy(() => import('./pages/token-detail'));
const SendTokenPage = lazy(() => import('./pages/send-token'));
const ReceiveTokenPage = lazy(() => import('./pages/receive-token'));
const PasswordPage = lazy(() => import('./pages/password'));
const SettingsPage = lazy(() => import('./pages/settings'));
const AccountManagePage = lazy(() => import('./pages/account-manage'));

const App: FC = observer(() => {
  const [ready, setReady] = useState(false)
  const { isUserLoggedIn, oidcTokens } = useOidc()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const vConsoleRef = useRef<VConsole>();

  // show vConsole if is mobile and test env
  useEffect(() => {
    if (isDesktop && vConsoleRef.current) {
      vConsoleRef.current.destroy();
      vConsoleRef.current = undefined;
    }
    if (!isDesktop && !vConsoleRef.current && HIBIT_ENV !== HibitEnv.PROD) {
      vConsoleRef.current = new VConsole();
    }
  }, [isDesktop]);

  useEffect(() => {
    (async () => {
      if (RUNTIME_ENV === RuntimeEnv.SDK) {
        await rpcManager.init()
      }
      if (isUserLoggedIn) {
        if (RUNTIME_ENV === RuntimeEnv.SDK) {
          rpcManager.notifyLoginChanged(true, oidcTokens.decodedIdToken.sub as string || '')
        }
        await hibitIdSession.login(oidcTokens)
        if (!hibitIdSession.isMnemonicCreated) {
          navigate('/create-password')
        } else if (!hibitIdSession.isUnlocked) {
          navigate('/verify-password')
        }
      } else {
        // login on launch if is as Telegram Mini App
        if (IS_TELEGRAM_MINI_APP && RUNTIME_PARAMS_RAW) {
          try {
            await authManager.login(AuthenticatorType.Telegram, RUNTIME_PARAMS_RAW)
          } catch (e) {
            console.error(e)
            toaster.error('Telegram login failed')
          }
        } else if (RUNTIME_ENV === RuntimeEnv.SDK) {
          rpcManager.notifyLoginChanged(false)
          if (rpcManager.passiveDisconnecting) {
            rpcManager.notifyDisconnected()
          }
          if (rpcManager.activeDisconnecting) {
            rpcManager.notifyAccountsChanged(null)
          }
        }
      }
      setReady(true)
    })()
  }, [isUserLoggedIn])

  return (
    <main className={twMerge('h-full', (hibitIdSession.isLoggedIn || !isDesktop) && 'max-w-[576px] mx-auto py-6 bg-base-200')}>
      {!ready && <PageLoading />}

      {ready && (
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/oidc-login" element={<OidcLoginPage />} />

            {hibitIdSession.isLoggedIn && (
              <>
                <Route path="/" element={<MainPage />} />
                <Route path="/network-select" element={<SelectNetworkPage />} />
                <Route path="/verify-password" element={<PasswordPage type="verify" />} />
                <Route path="/create-password" element={<PasswordPage type="create" />} />
                <Route path="/change-password" element={<PasswordPage type="change" />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/account-manage" element={<AccountManagePage />} />
                <Route path="/token/:addressOrSymbol" element={<TokenDetailPage />} />
                <Route path="/send/:addressOrSymbol?" element={<SendTokenPage />} />
                <Route path="/receive" element={<ReceiveTokenPage />} />
              </>
            )}

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      )}
    </main>
  );
});

export default App
