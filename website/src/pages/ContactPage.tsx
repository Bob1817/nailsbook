import { useState } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

export default function ContactPage() {
  const { lang } = useLang()
  const c = recruitment[lang]
  const [showCode, setShowCode] = useState(false)
  return (
    <div className="recruitment-site">
      <Meta title={c.contact} />
      <NavBar />
      <main className="site-container reading-page">
        <Link className="text-button" to="/">
          ← {c.back}
        </Link>
        <p className="eyebrow">LET’S TALK</p>
        <h1>{c.contactTitle}</h1>
        <p className="section-intro">{c.contactIntro}</p>
        <div className="button-row">
          <button className="site-button" onClick={() => setShowCode(true)}>
            {c.follow}
          </button>
          <Link className="site-button secondary" to="/apply">
            {c.apply}
          </Link>
        </div>
        <p className="contact-note">{c.contactNote}</p>
        <p className="fine-print">{c.brandNote}</p>
      </main>
      <SiteFooter />
      {showCode && <ScanQrModal type="follow" onClose={() => setShowCode(false)} />}
    </div>
  )
}
