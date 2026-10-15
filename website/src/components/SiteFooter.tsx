import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

export default function SiteFooter() {
  const { lang } = useLang()
  const c = recruitment[lang]
  return (
    <footer className="site-footer site-container">
      <div>
        <strong>OnlyNail</strong>
        <p>{c.footer}</p>
        <p className="fine-print">{c.brandNote}</p>
      </div>
      <div className="footer-links">
        <Link to="/contact">{c.contact}</Link>
        <Link to="/application-info">{c.info}</Link>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
          浙ICP备2026038278号-1
        </a>
        <span className="fine-print">© 2026 OnlyNail</span>
      </div>
    </footer>
  )
}
