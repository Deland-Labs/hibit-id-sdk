import React from 'react'
import ReactDOM from 'react-dom/client'
import 'reflect-metadata'
import { IS_IN_IFRAME, RUNTIME_ENV, RUNTIME_PARAMS } from './utils/runtime.ts'
import App from './App.tsx'
import './index.css'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './apis/index.ts'
import './i18n'
import HibitToastContainer from './components/Toaster/Container.tsx'
import BigNumber from 'bignumber.js'
import { OidcProvider } from './utils/oidc/index.ts'

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

console.log('[runtime env]', RUNTIME_ENV)
console.log('[runtime params]', RUNTIME_PARAMS)

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
      </QueryClientProvider>
    </OidcProvider>
  </React.StrictMode>
)
