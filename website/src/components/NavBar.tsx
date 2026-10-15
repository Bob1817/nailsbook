import { useState } from 'react'
import { Menu, X, Globe } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

export default function NavBar() {
  const { lang, toggleLang, isZh } = useLang()
  const c = recruitment[lang]
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const links = [
    { href: '/#audience', label: isZh ? '适合谁' : 'For whom' },
    { href: '/#features', label: isZh ? '如何帮你' : 'Features' },
    { href: '/#mini-program', label: isZh ? '小程序体验' : 'Mini program' },
    { href: '/#flow', label: isZh ? '入驻方式' : 'How to join' },
    { href: '/faq', label: isZh ? '常见问题' : 'FAQ' },
  ]
  return (
    <header className="site-header">
      <nav className="site-container site-nav" aria-label={isZh ? '主导航' : 'Main navigation'}>
        <Link to="/" className="site-logo" aria-label="OnlyNail" onClick={() => setOpen(false)}>
          <img src="/onlynail-wordmark.jpg" alt="OnlyNail" width="110" height="40" />
        </Link>
        <div className="desktop-links">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          <Link to="/apply" className="site-button small nav-apply">
            {c.apply}
          </Link>
          <button
            className="icon-button"
            onClick={toggleLang}
            aria-label={isZh ? 'Switch to English' : '切换中文'}
          >
            <Globe size={18} />
          </button>
          <button
            className="icon-button mobile-menu-button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? (isZh ? '关闭菜单' : 'Close menu') : isZh ? '打开菜单' : 'Open menu'}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      {open && (
        <div
          id="mobile-navigation"
          className="mobile-navigation site-container"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link to="/apply" className="site-button" onClick={() => setOpen(false)}>
            {c.apply}
          </Link>
        </div>
      )}
    </header>
  )
}
