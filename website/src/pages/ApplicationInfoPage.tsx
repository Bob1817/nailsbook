import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

export default function ApplicationInfoPage() {
  const { lang } = useLang()
  const c = recruitment[lang]
  return (
    <div className="recruitment-site">
      <Meta title={c.info} />
      <NavBar />
      <main className="site-container reading-page">
        <Link className="text-button" to="/apply">
          ← {c.apply}
        </Link>
        <h1>{c.infoTitle}</h1>
        <p className="section-intro">{c.infoIntro}</p>
        <div className="reading-content">
          {c.infoSections.map((item) => (
            <section key={item.title} className="info-section">
              <h2>{item.title}</h2>
              <p>{item.desc}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
