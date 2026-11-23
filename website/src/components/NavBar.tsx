import { useEffect, useState } from 'react'
import { Menu, X, Globe } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

const SECTION_IDS = ['features', 'flagship', 'pricing']
const HEADER_OFFSET = 120

interface NavLinkItem {
  href: string
  label: string
  sectionId?: string
}

export default function NavBar() {
  const { lang, toggleLang, isZh } = useLang()
  const c = recruitment[lang]
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')

  const links: NavLinkItem[] = [
    { href: '/#features', label: isZh ? '核心能力' : 'Features', sectionId: 'features' },
    { href: '/#flagship', label: isZh ? '主页效果' : 'Preview', sectionId: 'flagship' },
    { href: '/#pricing', label: isZh ? '版本方案' : 'Pricing', sectionId: 'pricing' },
    { href: '/faq', label: isZh ? '常见问题' : 'FAQ' },
    { href: '/about', label: isZh ? '关于我们' : 'About' },
  ]

  useEffect(() => {
    if (pathname !== '/') {
      setActiveSection('')
      return
    }

    let ticking = false
    const handleScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        let current = ''

        for (const id of SECTION_IDS) {
          const el = document.getElementById(id)
          if (!el) continue
          const rect = el.getBoundingClientRect()
          if (rect.top <= HEADER_OFFSET && rect.bottom > HEADER_OFFSET) {
            current = id
            break
          }
        }

        // 页面触底保护：如果已滚到最底部，高亮最后一个定价章节
        if (
          !current &&
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60
        ) {
          current = 'pricing'
        }

        setActiveSection(current)
        ticking = false
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  const isLinkActive = (link: NavLinkItem) => {
    if (pathname === '/') {
      return link.sectionId ? activeSection === link.sectionId : false
    }
    return pathname === link.href
  }

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    sectionId?: string
  ) => {
    if (pathname === '/' && sectionId) {
      e.preventDefault()
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        window.history.pushState(null, '', href)
        setActiveSection(sectionId)
      }
    }
    setOpen(false)
  }

  return (
    <header className="site-header">
      <nav className="site-container site-nav" aria-label={isZh ? '主导航' : 'Main navigation'}>
        <Link
          to="/"
          className="site-logo"
          aria-label="OnlyNail"
          onClick={() => {
            setOpen(false)
            if (pathname === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' })
              setActiveSection('')
            }
          }}
        >
          <img src="/onlynail-wordmark.jpg" alt="OnlyNail" width="110" height="40" />
        </Link>
        <div className="desktop-links">
          {links.map((link) => {
            const active = isLinkActive(link)
            return link.href.startsWith('/#') ? (
              <a
                key={link.href}
                href={link.href}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, link.href, link.sectionId)}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
        <div className="nav-actions">
          <Link to="/apply" className="site-button small nav-apply">
            {c.apply}
          </Link>
          <button
            type="button"
            className="icon-button"
            onClick={toggleLang}
            aria-label={isZh ? 'Switch to English' : '切换中文'}
          >
            <Globe size={18} />
          </button>
          <button
            type="button"
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
          {links.map((link) => {
            const active = isLinkActive(link)
            return link.href.startsWith('/#') ? (
              <a
                key={link.href}
                href={link.href}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, link.href, link.sectionId)}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            )
          })}
          <Link to="/apply" className="site-button" onClick={() => setOpen(false)}>
            {c.apply}
          </Link>
        </div>
      )}
    </header>
  )
}
