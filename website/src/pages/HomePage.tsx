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
import { getFeaturedP0Guides, GUIDE_CATEGORY_MAP } from '../content/guides'
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
                {isZh ? '前期活动 · 已注册可申请' : 'Early Program · Registered Artists'}
              </span>
              <span className="hero-campaign-text">
                {isZh ? '官方 1 对 1 指导 · 本批限 10 席' : '1-on-1 Guidance · 10 spots this round'}
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
              <Link to="/demo" className="site-button secondary">
                {isZh ? '查看 demo 样板间（免登录）' : 'View Demo (No Sign-in)'}
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
              <Link
                to="/demo"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:bg-[var(--nb-pressed)]"
              >
                <Sparkles size={13} />
                {isZh ? '查看样板间（免登录直达）→' : 'View Demo Showcase →'}
              </Link>
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
                      {isZh ? '免费注册' : 'Register Free'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setScanMeta(null)
                        setScan('try')
                      }}
                      className={`site-button small w-full ${tier.featured ? '' : 'secondary'}`}
                    >
                      {isZh ? `选择${tier.name}` : `Choose ${tier.name}`}
                    </button>
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

          <p className="mt-4 text-xs text-ink-muted">
            {isZh ? '已经注册，想有人带一把？' : 'Already registered and want a hand? '}
            <Link to="/model-artists" className="font-semibold text-ink hover:underline">
              {isZh
                ? '可申请前期 1 对 1 指导活动（名额有限）'
                : 'Apply for the early 1-on-1 guidance program (limited spots)'}
            </Link>
          </p>

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
              <Link to="/demo" className="site-button secondary">
                {isZh ? '查看 demo 样板间（免登录）' : 'View Demo (No Sign-in)'}
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

          <div className="mt-10 pt-8 border-t border-line">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {isZh ? '独立美甲师接单与经营指南' : 'Guides for Independent Nail Artists'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isZh
                    ? '没有店怎么接单、客户怎么管、报价怎么定，一问一页讲透。'
                    : 'Practical answers on orders, clients, pricing, and daily workflow.'}
                </p>
              </div>
              <Link
                to="/guides"
                className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink shrink-0"
              >
                <span>{isZh ? '查看全部 40 篇指南' : 'All Guides'}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getFeaturedP0Guides(4).map((guide) => (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 min-h-[44px] transition hover:border-ink/40"
                >
                  <div>
                    <span className="inline-block rounded-full bg-[var(--nb-pressed)] px-2 py-0.5 text-[10px] font-semibold text-ink mb-2">
                      {GUIDE_CATEGORY_MAP[guide.category].label}
                    </span>
                    <div className="text-sm font-bold text-ink leading-snug group-hover:underline">
                      {guide.title}
                    </div>
                    <p className="mt-1.5 text-xs text-ink-muted line-clamp-2">{guide.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      {showMobileApply && !scan && (
        <div className="mobile-apply">
          <Link
            to="/demo"
            className="site-button secondary mobile-btn-half"
          >
            <span>{isZh ? '查看样板间' : 'View Demo'}</span>
          </Link>
          <button
            type="button"
            className="site-button mobile-btn-half"
            onClick={() => {
              setScanMeta(null)
              setScan('try')
            }}
          >
            {isZh ? '免费注册' : 'Register Free'}
            <ArrowUpRight size={16} />
          </button>
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
