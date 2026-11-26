import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import WorksGalleryPage from './pages/WorksGalleryPage'
import FAQPage from './pages/FAQPage'
import ContactPage from './pages/ContactPage'
import AboutPage from './pages/AboutPage'
import ApplicationInfoPage from './pages/ApplicationInfoPage'
import ModelArtistCampaignPage from './pages/ModelArtistCampaignPage'
import DemoPage from './pages/DemoPage'
import { QuoteCalculatorPage } from './pages/quote/QuoteCalculatorPage'
import { QuoteDetailPage } from './pages/quote/QuoteDetailPage'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        const timer = setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' })
        }, 50)
        return () => clearTimeout(timer)
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/apply" element={<ModelArtistCampaignPage />} />
        <Route path="/model-artists" element={<ModelArtistCampaignPage />} />
        <Route path="/campaign" element={<ModelArtistCampaignPage />} />
        <Route path="/gallery" element={<WorksGalleryPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/about" element={<AboutPage />} />
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
