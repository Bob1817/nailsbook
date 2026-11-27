import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'
import { GUIDE_CATEGORIES } from '../content/guides'

export default function SiteFooter() {
  const { lang } = useLang()
  const c = recruitment[lang]
  return (
    <footer className="site-footer site-container">
      <div className="footer-brand-col">
        <div className="brand-mark">
          <span className="brand-dot" aria-hidden="true">
            ON
          </span>
          <strong>OnlyNail</strong>
        </div>
        <p>{c.footer}</p>
        <p className="fine-print">{c.brandNote}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
          <Link to="/guides" className="font-semibold text-ink hover:underline">
            经营指南
          </Link>
          {GUIDE_CATEGORIES.map((cat) => (
            <Link key={cat.key} to={`/guides#${cat.key}`} className="hover:text-ink hover:underline">
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="footer-links">
        <Link to="/guides">经营指南</Link>
        <Link to="/about">{c.about}</Link>
        <Link to="/contact">{c.contact}</Link>
        <Link to="/application-info">{c.info}</Link>
        <Link to="/model-artists">官方 1 对 1 指导（前期活动）· 已注册可申请</Link>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
          浙ICP备2026038278号-1
        </a>
        <span className="fine-print">© 2026 OnlyNail</span>
      </div>
    </footer>
  )
}
