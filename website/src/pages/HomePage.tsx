import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, Flower2, NotebookPen, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import AppPreview from '../components/AppPreview'
import ScanQrModal from '../components/ScanQrModal'
import FlagshipShowcaseSection from '../components/FlagshipShowcaseSection'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

const icons = [Flower2, CalendarDays, NotebookPen]

export default function HomePage() {
  const { lang, isZh } = useLang()
  const c = recruitment[lang]
  const [scan, setScan] = useState<'try' | 'follow' | 'artist' | null>(null)
  const [scanMeta, setScanMeta] = useState<{ workTitle?: string } | null>(null)
  const [showMobileApply, setShowMobileApply] = useState(false)
  const hero = useRef<HTMLElement>(null)

  useEffect(() => {
    const target = hero.current
    if (!target) return

    if (!('IntersectionObserver' in window)) {
      setShowMobileApply(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      setShowMobileApply(!entry.isIntersecting)
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="recruitment-site has-mobile-cta">
      <Meta />
      <a className="skip-link" href="#main">
        {isZh ? '跳到主要内容' : 'Skip to content'}
      </a>
      <NavBar />
      <main id="main">
        <section ref={hero} className="site-container hero-section">
          <div className="hero-copy">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>
              {c.title[0]}
              <br />
              <span>{c.title[1]}</span>
            </h1>
            <p className="hero-intro">{c.intro}</p>
            <div className="button-row">
              <Link to="/apply" className="site-button">
                {c.applyHero || c.apply}
                <ArrowUpRight size={18} />
              </Link>
              <a href="#flagship" className="site-button secondary">
                <Sparkles size={16} />
                {c.flagshipBtn || '查看先锋样板间（听栖美甲）'}
              </a>
            </div>
            <div className="invitation-note">
              <span className="status-dot" />
              <div>
                <strong>{c.invite}</strong>
                <p>{c.inviteNote}</p>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <p className="visual-overline">
              {isZh ? 'REAL PRODUCT SCREENS · 真实产品界面' : 'REAL PRODUCT SCREENS'}
            </p>
            <AppPreview />
          </div>
        </section>

        {/* 标杆样板店（听栖美甲工作室 · 贝贝） */}
        <FlagshipShowcaseSection
          onOpenScan={(type, meta) => {
            setScanMeta(meta || null)
            setScan(type)
          }}
        />

        {/* 美甲师核心赋能 */}
        <section id="features" className="site-section site-container">
          <p className="eyebrow">01 / {isZh ? '美甲师赋能' : 'FOR ARTISTS'}</p>
          <h2>{c.scenarioTitle}</h2>
          <p className="section-intro">{c.scenarioIntro}</p>
          <div className="scenario-grid">
            {c.scenarios.map((item, i) => {
              const Icon = icons[i]
              return (
                <article key={item.title} className="scenario-card">
                  <div className="scenario-icon">
                    <Icon size={28} strokeWidth={1.3} />
                  </div>
                  <span className="scenario-index">0{i + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                  <div className="scenario-tags">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* 入驻流程与常见问题 */}
        <section id="flow" className="site-section site-container flow-faq-section">
          <div className="flow-heading">
            <p className="eyebrow">02 / {isZh ? '开启新日常' : 'GETTING STARTED'}</p>
            <h2>{c.flowTitle}</h2>
            <p className="section-intro">{c.flowNote}</p>
          </div>

          <ol className="flow-steps-grid">
            {c.steps.map((step, i) => (
              <li key={step}>
                <span>0{i + 1}</span>
                <h3>{step}</h3>
              </li>
            ))}
          </ol>

          <div className="flow-cta-banner">
            <div>
              <h3>{c.finalTitle}</h3>
              <p>{c.finalIntro}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <Link to="/apply" className="site-button">
                {c.applyHero || c.apply}
                <ArrowUpRight size={18} />
              </Link>
              <Link to="/apply?tab=progress" className="site-button secondary">
                {c.checkProgress}
              </Link>
            </div>
          </div>

          <div className="compact-faq-block">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-ink">{c.faqTitle}</h3>
              <Link to="/faq" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1">
                {c.allFaq}
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {c.faqs.slice(0, 3).map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>
                    {item.q}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      {showMobileApply && !scan && (
        <div className="mobile-apply">
          <button
            type="button"
            className="site-button secondary mobile-btn-half"
            onClick={() => {
              setScanMeta(null)
              setScan('artist')
            }}
          >
            <Sparkles size={15} />
            <span>{c.flagshipBtnShort || '查看样板'}</span>
          </button>
          <Link className="site-button mobile-btn-half" to="/apply">
            {c.applyHero || c.apply}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      {scan && (
        <ScanQrModal
          type={scan}
          artistId={55}
          artistName="贝贝"
          shopName="听栖美甲工作室"
          workTitle={scanMeta?.workTitle}
          onClose={() => {
            setScan(null)
            setScanMeta(null)
          }}
        />
      )}
    </div>
  )
}
