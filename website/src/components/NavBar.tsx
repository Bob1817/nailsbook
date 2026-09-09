import { useState, useEffect } from 'react'
import { Menu, X, Globe } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'

const navLinkKeys = ['audience', 'features', 'works', 'flow'] as const

export default function NavBar() {
  const { t, toggleLang, isZh } = useLang()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const navLinks = navLinkKeys.map((key) => ({
    label: t.nav[key],
    href: `#${key}`,
  }))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isHomePage = location.pathname === '/'

  return (
    <>
      <nav
        className={`relative z-40 mx-auto flex max-w-6xl items-center justify-between rounded-full border px-3 py-2 transition-shadow duration-300 sm:px-5 sm:py-3 ${
          scrolled
            ? 'border-white/60 bg-white/80 shadow-lg shadow-black/40 backdrop-blur-xl'
            : 'border-white/80 bg-white/80 backdrop-blur-xl'
        }`}
        aria-label="main-navigation"
        data-component="NavBar"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex min-h-9 items-center gap-2 rounded-full px-1 transition active:scale-[0.98] sm:min-h-11 sm:gap-2.5"
          aria-label="贝美甲 home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent-warm text-white font-bold text-base select-none shadow-md shadow-black/50 sm:h-10 sm:w-10 sm:text-lg" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.09 7.26L18 8.27L14 12.14L14.18 18L10 15.77L5.82 18L6 12.14L2 8.27L7.91 7.26L10 2Z" fill="currentColor" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <div className="text-base font-black tracking-[0.15em] text-ink">贝美甲</div>
            <div className="text-[11px] font-medium tracking-[0.06em] text-ink-soft">{t.nav.subtitle}</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-4 text-sm font-medium text-ink-muted md:flex lg:gap-6">
          {isHomePage &&
            navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative min-h-11 flex items-center rounded-full px-2 transition hover:text-brand"
              >
                {link.label}
              </a>
            ))}
          <Link
            to="/faq"
            className="relative min-h-11 flex items-center rounded-full px-2 transition hover:text-brand"
          >
            {t.nav.faq}
          </Link>
          <Link
            to="/contact"
            className="relative min-h-11 flex items-center rounded-full px-2 transition hover:text-brand"
          >
            {t.nav.contact}
          </Link>
        </div>

        {/* CTA + Language + Mobile menu */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Language toggle */}
          <button
            type="button"
            onClick={toggleLang}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-muted transition hover:text-brand active:scale-[0.95] sm:h-10 sm:w-10"
            aria-label={isZh ? 'Switch to English' : '切换到中文'}
            title={isZh ? 'Switch to English' : '切换到中文'}
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-muted transition active:scale-[0.95] sm:h-11 sm:w-11 md:hidden"
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div
          className="absolute inset-x-2 top-[4.5rem] z-30 rounded-3xl border border-line bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-4 sm:top-[5.5rem] sm:p-5"
          role="dialog"
          aria-label="mobile menu"
        >
          <ul className="space-y-1">
            {isHomePage &&
              navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-2xl px-4 text-base font-medium text-ink transition hover:bg-brand-mist hover:text-brand"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            <li>
              <Link
                to="/faq"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-2xl px-4 text-base font-medium text-ink transition hover:bg-brand-mist hover:text-brand"
              >
                {t.nav.faq}
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-2xl px-4 text-base font-medium text-ink transition hover:bg-brand-mist hover:text-brand"
              >
                {t.nav.contact}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </>
  )
}
