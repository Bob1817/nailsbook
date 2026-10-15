import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, Flower2, NotebookPen } from 'lucide-react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import AppPreview from '../components/AppPreview'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

const icons = [Flower2, CalendarDays, NotebookPen]

export default function HomePage() {
  const { lang, isZh } = useLang()
  const c = recruitment[lang]
  const [scan, setScan] = useState<'try' | 'follow' | null>(null)
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
                {c.apply}
                <ArrowUpRight size={18} />
              </Link>
              <a href="#demo" className="site-button secondary">
                {c.demo}
                <ArrowRight size={18} />
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
            <p className="visual-overline">YOUR WORK. YOUR RHYTHM.</p>
            <AppPreview />
          </div>
        </section>
        <section id="audience" className="site-section audience-section">
          <div className="site-container">
            <p className="eyebrow">01 / {isZh ? '为这样的你' : 'MADE FOR YOU'}</p>
            <h2>{c.audienceTitle}</h2>
            <p className="section-intro">{c.audienceIntro}</p>
            <div className="audience-grid">
              {c.audiences.map((item, i) => (
                <article key={item.title}>
                  <span className="section-number">0{i + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="features" className="site-section site-container">
          <p className="eyebrow">02 / {isZh ? '你的经营日常' : 'YOUR WORKING DAY'}</p>
          <h2>{c.scenarioTitle}</h2>
          <p className="section-intro">{c.scenarioIntro}</p>
          <div className="scenario-grid">
            {c.scenarios.map((item, i) => {
              const Icon = icons[i]
              return (
                <article key={item.title} className="scenario-card">
                  <div className="scenario-icon">
                    <Icon size={30} strokeWidth={1.3} />
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
        <section id="demo" className="site-section demo-section">
          <div className="site-container demo-layout">
            <div>
              <p className="eyebrow">03 / {isZh ? '从客户到美甲师' : 'BOTH SIDES OF A SERVICE'}</p>
              <h2>{c.demoTitle}</h2>
              <p className="section-intro">{c.demoIntro}</p>
              <p className="demo-explanation">
                {isZh
                  ? '客户从你的主页了解服务、选择时间。你在小程序里查看预约，完成服务后保留记录。经营不必从一段新的聊天重新开始。'
                  : 'Clients explore services and request a time from your page. You review appointments and keep notes after each visit. Pick up where you left off.'}
              </p>
              <button className="text-button" onClick={() => setScan('try')}>
                {isZh ? '查看小程序入口' : 'Find the mini program'}
                <ArrowUpRight size={18} />
              </button>
            </div>
            <AppPreview />
          </div>
        </section>
        <section id="mini-program" className="site-section site-container mini-guide-section">
          <div className="mini-guide-copy">
            <p className="eyebrow">04 / {isZh ? '打开微信小程序' : 'OPEN IN WECHAT'}</p>
            <h2>{c.miniTitle}</h2>
            <p className="section-intro">{c.miniIntro}</p>
            <ol className="mini-guide-steps">
              {c.miniSteps.map((step, i) => (
                <li key={step.title}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="mini-code-card">
            <div className="mini-code-image">
              <img
                src="/miniprogram-code.jpg"
                alt={isZh ? 'OnlyNail 小程序码' : 'OnlyNail mini program code'}
              />
            </div>
            <strong>OnlyNail</strong>
            <p>{isZh ? '微信扫码或搜索 OnlyNail' : 'Scan or search OnlyNail in WeChat'}</p>
            <button className="site-button" onClick={() => setScan('try')}>
              {c.miniAction}
              <ArrowUpRight size={18} />
            </button>
            <small>{c.miniApplyNote}</small>
          </div>
        </section>
        <section id="join" className="site-section site-container">
          <div className="policy-heading">
            <div>
              <p className="eyebrow">
                05 / {isZh ? '邀请同行，一起打磨' : 'BUILDING WITH ARTISTS'}
              </p>
              <h2>{c.policyTitle}</h2>
            </div>
            <p className="section-intro">{c.policyIntro}</p>
          </div>
          <div className="policy-grid">
            {c.policies.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="flow" className="site-container flow-section">
          <h2>{c.flowTitle}</h2>
          <ol>
            {c.steps.map((step, i) => (
              <li key={step}>
                <span>0{i + 1}</span>
                <h3>{step}</h3>
              </li>
            ))}
          </ol>
          <p className="fine-print">{c.flowNote}</p>
        </section>
        <section className="site-section site-container faq-section">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>{c.faqTitle}</h2>
            <Link to="/faq" className="text-button">
              {c.allFaq}
              <ArrowRight size={18} />
            </Link>
          </div>
          <div>
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
        </section>
        <section className="final-invite">
          <div className="site-container">
            <p className="eyebrow">LET’S MAKE ROOM FOR GOOD WORK.</p>
            <h2>{c.finalTitle}</h2>
            <p>{c.finalIntro}</p>
            <Link to="/apply" className="site-button light">
              {c.apply}
              <ArrowUpRight size={18} />
            </Link>
            <button className="text-button" onClick={() => setScan('follow')}>
              {c.follow}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>
      <SiteFooter />
      {showMobileApply && !scan && (
        <div className="mobile-apply">
          <span>{c.invite}</span>
          <Link className="site-button" to="/apply">
            {c.apply}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      {scan && <ScanQrModal type={scan} onClose={() => setScan(null)} />}
    </div>
  )
}
