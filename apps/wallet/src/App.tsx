import { FC, Suspense, lazy, useEffect, useState } from 'react';
import { observer } from 'mobx-react'
import { Routes, Route, Navigate } from 'react-router-dom';
import hibitIdSession from './stores/session';
import { twMerge } from 'tailwind-merge'
import { useIsDesktop } from './utils/hooks';
import PageLoading from './components/PageLoading';
import { useOidc } from './utils/oidc';
import { RUNTIME_ENV, RUNTIME_PARAMS_RAW } from './utils/runtime';
import { RuntimeEnv } from './utils/basicEnums';
import { AuthenticatorType } from '@deland-labs/hibit-id-sdk';
import authManager from './utils/auth';

const MainPage = lazy(() => import('./pages/main'));
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

  useEffect(() => {
    (async () => {
      if (isUserLoggedIn) {
        await hibitIdSession.connect(oidcTokens)
      } else {
        // login on launch if is as Telegram Mini App
        if (RUNTIME_ENV === RuntimeEnv.TELEGRAM_MINI_APP && RUNTIME_PARAMS_RAW) {
          await authManager.login(AuthenticatorType.Telegram, RUNTIME_PARAMS_RAW)
        }
      }
      setReady(true)
    })()
  }, [isUserLoggedIn])

  return (
    <main className={twMerge('h-full', (hibitIdSession.isConnected || !isDesktop) && 'max-w-[576px] mx-auto p-6 bg-base-200')}>
      {!ready && <PageLoading />}

      {ready && (
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/oidc-login" element={<OidcLoginPage />} />

            {hibitIdSession.isConnected && (
              <>
                <Route path="/" element={<MainPage />} />
                <Route path="/create-password" element={<PasswordPage isReset={false} />} />
                <Route path="/change-password" element={<PasswordPage isReset={true} />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/account-manage" element={<AccountManagePage />} />
                <Route path="/token/:addressOrSymbol" element={<TokenDetailPage />} />
                <Route path="/send/:addressOrSymbol?" element={<SendTokenPage />} />
                <Route path="/receive/:addressOrSymbol?" element={<ReceiveTokenPage />} />
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
