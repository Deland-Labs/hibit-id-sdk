import { FC, Suspense, lazy } from 'react';
import { observer } from 'mobx-react'
import { Routes, Route, Navigate } from 'react-router-dom';
import hibitIdSession from './stores/session';
import { twMerge } from 'tailwind-merge'
import { useIsDesktop } from './utils/hooks';
import PageLoading from './components/PageLoading';

const MainPage = lazy(() => import('./pages/main'));
const LoginPage = lazy(() => import('./pages/login'));
const TokenDetailPage = lazy(() => import('./pages/token-detail'));
const SendTokenPage = lazy(() => import('./pages/send-token'));
const ReceiveTokenPage = lazy(() => import('./pages/receive-token'));

const App: FC = observer(() => {
  const isDesktop = useIsDesktop()

  return (
    <main className={twMerge((hibitIdSession.isEx3Authenticated || !isDesktop) && 'h-full max-w-[576px] mx-auto bg-base-200 p-6')}>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {hibitIdSession.isEx3Authenticated && (
            <>
              <Route path="/" element={<MainPage />} />
              <Route path="/token/:addressOrSymbol" element={<TokenDetailPage />} />
              <Route path="/send/:addressOrSymbol?" element={<SendTokenPage />} />
              <Route path="/receive/:addressOrSymbol?" element={<ReceiveTokenPage />} />
            </>
          )}

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </main>
  );
});

export default App
