import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'
import './recruitment.css'

const rootEl = document.getElementById('root')!
const appNode = (
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
)

if (rootEl.innerHTML.trim().length > 0 && !rootEl.innerHTML.includes('<!--app-html-->')) {
  hydrateRoot(rootEl, appNode)
} else {
  createRoot(rootEl).render(appNode)
}
