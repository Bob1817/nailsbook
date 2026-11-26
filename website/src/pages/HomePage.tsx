import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Flower2,
  NotebookPen,
  QrCode,
  ReceiptText,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import AppPreview from '../components/AppPreview'
import ScanQrModal from '../components/ScanQrModal'
import FlagshipShowcaseSection from '../components/FlagshipShowcaseSection'
import InteractiveDemoSection from '../components/demo/InteractiveDemoSection'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

const icons = [Flower2, ReceiptText, CalendarDays, NotebookPen]

export default function HomePage() {
  const { lang, isZh } = useLang()
  const c = recruitment[lang]
  const [scan, setScan] = useState<'try' | 'follow' | 'artist' | null>(null)
  const [scanMeta, setScanMeta] = useState<{ workTitle?: string } | null>(null)
  const [showMobileApply, setShowMobileApply] = useState(false)
  const hero = useRef<HTMLElement>(null)

  useEffect(() => {
    ['/miniprogram-code.jpg', '/wechat-mp-qrcode.jpg'].forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

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
            <Link to="/model-artists" className="hero-campaign-banner" role="banner">
              <span className="hero-campaign-badge">
                <Sparkles size={13} />
                {isZh ? '官方 1 对 1 指导 · 限10席' : '1-on-1 Setup · 10 Spots'}
              </span>
              <span className="hero-campaign-text">
                {isZh ? '专人 1 对 1 协助建店，赠首年高阶版' : 'Free 1-on-1 setup + 1st year Pro'}
              </span>
              <span className="hero-campaign-arrow">
                {isZh ? '了解详情' : 'Details'} <ArrowUpRight size={14} />
              </span>
            </Link>
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>
              {c.title[0]}
              <br />
              <span>{c.title[1]}</span>
            </h1>
            <p className="hero-intro">{c.intro}</p>
            <div className="button-row">
              <button
                type="button"
                className="site-button"
                onClick={() => {
                  setScanMeta(null)
                  setScan('try')
                }}
              >
                <QrCode size={17} />
                {c.scanTryBtn}
              </button>
              <Link to="/apply" className="site-button secondary">
                {c.applyHero || c.apply}
                <ArrowUpRight size={18} />
              </Link>
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
              {isZh ? 'REAL PRODUCT SCREENS · 真实工作台界面' : 'REAL PRODUCT SCREENS'}
            </p>
            <AppPreview />
            <div className="mt-3 flex justify-center">
              <a
                href="#interactive-demo"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:bg-neutral-100"
              >
                <Sparkles size={13} />
                {isZh ? '亲手体验 30 秒双端交互演示 ↓' : 'Try 30s interactive demo ↓'}
              </a>
            </div>
          </div>
        </section>

        {/* 01 / 四大核心能力（先讲解决什么痛点） */}
        <section id="features" className="site-section site-container">
          <p className="eyebrow">01 / {isZh ? '核心能力' : 'CORE CAPABILITIES'}</p>
          <h2>{c.scenarioTitle}</h2>
          <p className="section-intro">{c.scenarioIntro}</p>
          <div className="scenario-grid">
            {c.scenarios.map((item, i) => {
              const Icon = icons[i % icons.length]
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

        {/* 在线双端联动演示（30秒亲手体验核心闭环） */}
        <InteractiveDemoSection
          onOpenScan={(type, meta) => {
            setScanMeta(meta || null)
            setScan(type)
          }}
        />

        {/* 02 / 主页配置效果预览（作为工具落地效果证明） */}
        <FlagshipShowcaseSection
          onOpenScan={(type, meta) => {
            setScanMeta(meta || null)
            setScan(type)
          }}
        />

        {/* 03 / 透明版本方案（免费版 + 按额度阶梯付费） */}
        <section id="pricing" className="site-section site-container">
          <p className="eyebrow">{c.pricingEyebrow}</p>
          <h2>{c.pricingTitle}</h2>
          <p className="section-intro">{c.pricingIntro}</p>
          <div className="pricing-grid">
            {c.pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`pricing-card${tier.featured ? ' pricing-card-featured' : ''}`}
              >
                <div className="pricing-card-head">
                  <h3>{tier.name}</h3>
                  {tier.featured ? (
                    <span className="pricing-badge">{isZh ? '常用推荐' : 'Popular'}</span>
                  ) : null}
                </div>
                <div className="pricing-price-row">
                  <strong className="pricing-price">{tier.price}</strong>
                  <span className="pricing-cycle">{tier.cycle}</span>
                </div>
                {tier.stage ? <p className="pricing-stage">{tier.stage}</p> : null}
                <p className="pricing-target">{tier.target}</p>
                <ul className="pricing-metrics">
                  {tier.metrics.map((metric) => (
                    <li key={metric}>
                      <Check size={14} strokeWidth={2.2} />
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
                {tier.features && tier.features.length > 0 ? (
                  <div className="pricing-features">
                    {tier.features.map((feat) => (
                      <span key={feat} className="pricing-feature-tag">
                        {feat}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="pricing-card-cta">
                  {tier.price === '¥0' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setScanMeta(null)
                        setScan('try')
                      }}
                      className="site-button small w-full"
                    >
                      {isZh ? '免费开始使用' : 'Start Free'}
                    </button>
                  ) : (
                    <Link
                      to={`/apply?plan=${encodeURIComponent(tier.name)}`}
                      className={`site-button small w-full ${tier.featured ? '' : 'secondary'}`}
                    >
                      {isZh ? `选择${tier.name}` : `Choose ${tier.name}`}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          <p className="pricing-footnote">{c.pricingNote}</p>
        </section>

        {/* 04 / 快速开启与常见问题 */}
        <section id="flow" className="site-section site-container flow-faq-section">
          <div className="flow-heading">
            <p className="eyebrow">04 / {isZh ? '开始使用' : 'GETTING STARTED'}</p>
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
              <button
                type="button"
                className="site-button"
                onClick={() => {
                  setScanMeta(null)
                  setScan('try')
                }}
              >
                <QrCode size={17} />
                {c.scanTryBtn}
              </button>
              <Link to="/apply" className="site-button secondary">
                {c.applyHero || c.apply}
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>

          <div className="compact-faq-block">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-ink">{c.faqTitle}</h3>
              <Link
                to="/faq"
                className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
              >
                {c.allFaq}
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {c.faqs.slice(0, 4).map((item) => (
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
              setScan('try')
            }}
          >
            <QrCode size={15} />
            <span>{c.flagshipBtnShort || '扫码体验'}</span>
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
