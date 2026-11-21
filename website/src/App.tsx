import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import WorksGalleryPage from './pages/WorksGalleryPage'
import FAQPage from './pages/FAQPage'
import ContactPage from './pages/ContactPage'
import ApplicationInfoPage from './pages/ApplicationInfoPage'
import ArtistApplicationPage from './pages/ArtistApplicationPage'
import { QuoteCalculatorPage } from './pages/quote/QuoteCalculatorPage'
import { QuoteDetailPage } from './pages/quote/QuoteDetailPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/apply" element={<ArtistApplicationPage />} />
        <Route path="/gallery" element={<WorksGalleryPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/application-info" element={<ApplicationInfoPage />} />
        <Route path="/quote" element={<QuoteCalculatorPage />} />
        <Route path="/q/:token" element={<QuoteDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <LanguageProvider>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </LanguageProvider>
  )
}

export default App
