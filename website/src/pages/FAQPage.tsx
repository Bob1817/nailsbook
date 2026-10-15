import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

export default function FAQPage() {
  const { lang } = useLang()
  const c = recruitment[lang]
  return (
    <div className="recruitment-site">
      <Meta title={c.faqTitle} />
      <NavBar />
      <main className="site-container reading-page">
        <Link className="text-button" to="/">
          ← {c.back}
        </Link>
        <p className="eyebrow">FAQ</p>
        <h1>{c.faqTitle}</h1>
        <div className="reading-content">
          {c.faqs.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>
                {item.q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <Link to="/apply" className="site-button">
          {c.apply}
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
