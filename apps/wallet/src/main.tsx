import React from 'react'
import ReactDOM from 'react-dom/client'
import 'reflect-metadata'
import { IS_IN_IFRAME, IS_TELEGRAM_MINI_APP } from './utils/runtime.ts'
import App from './App.tsx'
import './index.css'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './apis/index.ts'
import './i18n'
import HibitToastContainer from './components/Toaster/Container.tsx'
import BigNumber from 'bignumber.js'
import { OidcProvider } from './utils/oidc/index.ts'
import VConsoleInvisibleTrigger from './components/VConsoleInvisibleTrigger.tsx'

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

// load login widget if not in tg mini app
if (!IS_TELEGRAM_MINI_APP) {
  const tgWidgetScript = document.createElement('script')
  tgWidgetScript.src = 'https://telegram.org/js/telegram-widget.js?22'
  document.body.appendChild(tgWidgetScript)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OidcProvider>
      <QueryClientProvider client={queryClient}>
        {IS_IN_IFRAME ? (
          <MemoryRouter>
            <App />
            <HibitToastContainer />
          </MemoryRouter>
        ) : (
          <BrowserRouter>
            <App />
            <HibitToastContainer />
          </BrowserRouter>
        )}
        <VConsoleInvisibleTrigger />
      </QueryClientProvider>
    </OidcProvider>
  </React.StrictMode>
)
