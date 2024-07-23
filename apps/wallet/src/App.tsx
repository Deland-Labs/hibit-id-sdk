import { FC, Suspense, lazy, useEffect, useState } from 'react';
import { observer } from 'mobx-react'
import { Routes, Route, Navigate } from 'react-router-dom';
import hibitIdSession from './stores/session';
import { twMerge } from 'tailwind-merge'
import { useIsDesktop } from './utils/hooks';
import PageLoading from './components/PageLoading';
import { RUNTIME_ENV, RUNTIME_PARAMS } from './utils/runtime';
import { RuntimeEnv } from './utils/basicEnums';
import authManager from './utils/auth'
import { AuthenticatorType, UserAuthInfo } from './utils/auth/types';
import { WEB_STORAGE_KEY } from './utils/constants';
import PasswordPage from './pages/password';

const MainPage = lazy(() => import('./pages/main'));
const LoginPage = lazy(() => import('./pages/login'));
const TokenDetailPage = lazy(() => import('./pages/token-detail'));
const SendTokenPage = lazy(() => import('./pages/send-token'));
const ReceiveTokenPage = lazy(() => import('./pages/receive-token'));

const App: FC = observer(() => {
  const [ready, setReady] = useState(false)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    (async () => {
      // login on launch if is as Telegram Mini App
      if (RUNTIME_ENV === RuntimeEnv.TELEGRAM_MINI_APP && RUNTIME_PARAMS) {
        await authManager.login(AuthenticatorType.Telegram, RUNTIME_PARAMS)
      } else if (RUNTIME_ENV === RuntimeEnv.SDK && RUNTIME_PARAMS) {
        await hibitIdSession.connect(RUNTIME_PARAMS as UserAuthInfo)
      } else if (RUNTIME_ENV === RuntimeEnv.WEB) {
        const storedAuth = sessionStorage.getItem(WEB_STORAGE_KEY)
        if (storedAuth) {
          try {
            await hibitIdSession.connect(JSON.parse(storedAuth) as UserAuthInfo)
          } catch (e) {
            console.error(e)
            sessionStorage.removeItem(WEB_STORAGE_KEY)
          }
        }
      }
      setReady(true)
    })()
  }, [])

  return (
    <main className={twMerge('h-full', (hibitIdSession.isConnected || !isDesktop) && 'max-w-[576px] mx-auto p-6 bg-base-200')}>
      {!ready && <PageLoading />}

      {ready && (
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {hibitIdSession.isConnected && (
              <>
                <Route path="/" element={<MainPage />} />
                <Route path="/create-password" element={<PasswordPage isReset={false} />} />
                <Route path="/change-password" element={<PasswordPage isReset={true} />} />
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
