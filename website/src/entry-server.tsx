import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async'
import { LanguageProvider } from './i18n/LanguageContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './App'

export function render(url: string): { html: string; head: string } {
  const helmetContext: { helmet?: HelmetServerState } = {}

  const html = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <LanguageProvider>
          <ErrorBoundary>
            <StaticRouter location={url}>
              <AppRoutes />
            </StaticRouter>
          </ErrorBoundary>
        </LanguageProvider>
      </HelmetProvider>
    </StrictMode>,
  )

  const helmet = helmetContext.helmet
  const head = helmet
    ? [
        helmet.title.toString(),
        helmet.meta.toString(),
        helmet.link.toString(),
      ]
        .filter(Boolean)
        .join('\n    ')
    : ''

  return { html, head }
}
