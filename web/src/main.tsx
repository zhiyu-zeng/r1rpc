import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { Toaster } from 'sonner'
import '@radix-ui/themes/styles.css'
import './theme.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium" scaling="100%">
      <HashRouter>
        <App />
      </HashRouter>
      <Toaster richColors closeButton position="top-right" theme="light" toastOptions={{ duration: 3000 }} />
    </Theme>
  </React.StrictMode>,
)
