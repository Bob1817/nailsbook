import { useState } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

export default function FAQPage() {
  const { lang, isZh } = useLang()
  const c = recruitment[lang]
  const [scan, setScan] = useState(false)
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
        <p className="mt-2 text-sm text-ink-muted">
          本页解答 OnlyNail 产品本身的收费、数据与使用问题；如果是接单、报价、客户管理等做事方法问题，请查看{' '}
          <Link to="/guides" className="font-semibold text-ink underline hover:opacity-80">
            独立美甲师经营指南区 →
          </Link>
        </p>
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
        <button type="button" className="site-button" onClick={() => setScan(true)}>
          {c.apply}
        </button>
        <p className="mt-2 text-sm text-ink-muted">
          {isZh
            ? '基础版永久免费，注册即用，无需审批。'
            : 'Free tier forever — register and start, no approval needed.'}
        </p>
      </main>
      <SiteFooter />
      {scan && <ScanQrModal type="try" onClose={() => setScan(false)} />}
    </div>
  )
}
