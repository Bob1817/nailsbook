import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import '../landing.css'

const icons = [Flower2, CalendarDays, NotebookPen]

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-visible')
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`home-reveal ${className}`.trim()}>
      {children}
    </div>
  )
}

function TaglineReveal({ lines, isZh }: { lines: string[]; isZh: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const words = Array.from(el.querySelectorAll<HTMLElement>('[data-word]'))
    const lightAll = () => words.forEach((word) => word.classList.add('lit'))
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      lightAll()
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lit')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    words.forEach((word) => observer.observe(word))
    return () => observer.disconnect()
  }, [lines, isZh])

  return (
    <div ref={containerRef} className="home-tagline">
      {lines.map((line) => {
        const units = isZh ? Array.from(line) : line.split(' ')
        return (
          <p key={line}>
            {units.map((unit, i) => (
              <span
                key={`${unit}-${i}`}
                data-word
                className="home-word"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                {unit}
                {!isZh && i < units.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

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
    <div className="recruitment-site has-mobile-cta home-page">
      <Meta />
      <a className="skip-link" href="#main">
        {isZh ? '跳到主要内容' : 'Skip to content'}
      </a>
      <NavBar />
      <main id="main">
        {/* Hero */}
        <section ref={hero} className="home-hero">
          <div className="site-container home-hero-grid">
            <div className="home-hero-copy">
              <h1 className="home-hero-title">
                {c.title[0]}
                <br />
                <span>{c.title[1]}</span>
              </h1>
              <p className="home-hero-intro body-3">{c.intro}</p>
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
              <div className="home-invite">
                <span className="home-invite-dot" />
                <div>
                  <strong>{c.invite}</strong>
                  <p>{c.inviteNote}</p>
                </div>
              </div>
            </div>
            <div className="home-hero-visual">
              <p className="home-visual-note">
                {isZh ? '真实产品界面 · REAL PRODUCT SCREENS' : 'REAL PRODUCT SCREENS'}
              </p>
              <AppPreview />
            </div>
          </div>
        </section>

        {/* Tagline 逐词点亮 */}
        <section className="home-tagline-section">
          <div className="site-container">
            <TaglineReveal lines={c.taglineLines} isZh={isZh} />
            <Reveal>
              <p className="home-tagline-note body-3">{c.taglineNote}</p>
            </Reveal>
          </div>
        </section>

        {/* 美甲师赋能 */}
        <section id="features" className="home-section">
          <div className="site-container">
            <Reveal>
              <div className="home-section-head">
                <h2 className="heading-3">{c.scenarioTitle}</h2>
                <p className="body-3">{c.scenarioIntro}</p>
              </div>
            </Reveal>
            <div className="home-benefits">
              {c.scenarios.map((item, i) => {
                const Icon = icons[i]
                return (
                  <Reveal key={item.title} className="home-benefit-reveal">
                    <article className="home-benefit-card">
                      <div className="home-benefit-top">
                        <span className="home-benefit-icon">
                          <Icon size={24} strokeWidth={1.3} />
                        </span>
                        <span className="home-benefit-index">0{i + 1}</span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                      <div className="home-benefit-tags">
                        {item.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </article>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* 入驻流程 */}
        <section id="flow" className="home-section home-section-tint">
          <div className="site-container">
            <Reveal>
              <div className="home-section-head">
                <h2 className="heading-3">{c.flowTitle}</h2>
              </div>
            </Reveal>
            <Reveal>
              <ol className="home-steps">
                {c.steps.map((step, i) => (
                  <li key={step}>
                    <span>0{i + 1}</span>
                    <h3>{step}</h3>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal>
              <p className="home-steps-note">{c.flowNote}</p>
            </Reveal>
          </div>
        </section>

        {/* 标杆样板店（听栖美甲工作室 · 贝贝） */}
        <FlagshipShowcaseSection
          onOpenScan={(type, meta) => {
            setScanMeta(meta || null)
            setScan(type)
          }}
        />

        {/* 常见问题 */}
        <section className="home-section home-section-tint">
          <div className="site-container">
            <Reveal>
              <div className="home-faq-head">
                <h2 className="heading-3">{c.faqTitle}</h2>
                <Link to="/faq" className="home-faq-link">
                  {c.allFaq}
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="home-faq-list">
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
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="home-final">
          <div className="site-container">
            <Reveal>
              <h2 className="heading-3">{c.finalTitle}</h2>
              <p>{c.finalIntro}</p>
              <div className="button-row">
                <Link to="/apply" className="site-button light">
                  {c.applyHero || c.apply}
                  <ArrowUpRight size={18} />
                </Link>
                <Link to="/apply?tab=progress" className="site-button ghost">
                  {c.checkProgress}
                </Link>
              </div>
            </Reveal>
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
