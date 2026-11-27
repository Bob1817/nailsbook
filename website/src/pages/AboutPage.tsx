import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageCircle, Copy, Check, QrCode, ExternalLink, ShieldCheck, Sparkles, UserCheck, Calendar } from 'lucide-react'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

function copyText(text: string, onSuccess: () => void) {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(onSuccess)
      .catch(() => {
        fallbackCopy(text, onSuccess)
      })
  } else {
    fallbackCopy(text, onSuccess)
  }
}

function fallbackCopy(text: string, onSuccess: () => void) {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    onSuccess()
  } catch {
    // 静默降级
  }
}

export default function AboutPage() {
  const { lang, isZh } = useLang()
  const c = recruitment[lang]
  const [showQr, setShowQr] = useState(false)
  const [showTry, setShowTry] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedWechat, setCopiedWechat] = useState(false)

  const handleCopyEmail = () => {
    copyText(c.aboutEmailAddress, () => {
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    })
  }

  const handleCopyWechat = () => {
    copyText(c.aboutWechatAccount, () => {
      setCopiedWechat(true)
      setTimeout(() => setCopiedWechat(false), 2000)
    })
  }

  const pillarIcons = [
    <SlidersIcon key="sliders" />,
    <UserCheck key="user" size={24} />,
    <Calendar key="cal" size={24} />,
    <Sparkles key="sparkles" size={24} />,
  ]

  return (
    <div className="recruitment-site">
      <Meta title={c.about} />
      <NavBar />
      <main className="site-container reading-page about-page">
        <Link className="text-button" to="/">
          ← {c.back}
        </Link>
        <p className="eyebrow">{c.aboutEyebrow}</p>
        <h1 className="about-main-title">{c.aboutTitle}</h1>
        <p className="section-intro about-intro">{c.aboutSubtitle}</p>

        {/* 商业承诺与底线 */}
        <section className="about-section" aria-labelledby="about-commitments-heading">
          <div className="about-section-header">
            <h2 id="about-commitments-heading">{c.aboutCommitmentTitle}</h2>
          </div>
          <div className="about-commitments-grid">
            {c.aboutCommitments.map((item, idx) => (
              <div key={idx} className="about-commitment-card">
                <div className="about-card-badge">
                  <ShieldCheck size={18} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 四大核心支柱 */}
        <section className="about-section" aria-labelledby="about-pillars-heading">
          <div className="about-section-header">
            <h2 id="about-pillars-heading">{c.aboutPillarsTitle}</h2>
          </div>
          <div className="about-pillars-grid">
            {c.aboutPillars.map((pillar, idx) => (
              <div key={pillar.number} className="about-pillar-card">
                <div className="about-pillar-top">
                  <span className="about-pillar-number">{pillar.number}</span>
                  <div className="about-pillar-icon">{pillarIcons[idx]}</div>
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 联系方式 */}
        <section className="about-section about-contact-section" aria-labelledby="about-contact-heading">
          <div className="about-section-header">
            <p className="eyebrow">CONTACT</p>
            <h2 id="about-contact-heading">{c.aboutContactTitle}</h2>
            <p className="about-contact-subtitle">{c.aboutContactSubtitle}</p>
          </div>

          <div className="about-contact-grid">
            {/* 邮箱联系卡片 */}
            <div className="about-contact-card">
              <div className="about-contact-header">
                <div className="about-contact-icon">
                  <Mail size={22} />
                </div>
                <div>
                  <span className="about-contact-badge">{c.aboutEmailTitle}</span>
                  <div className="about-contact-value">{c.aboutEmailAddress}</div>
                </div>
              </div>
              <p className="about-contact-desc">{c.aboutEmailDesc}</p>
              <div className="about-contact-actions">
                <button
                  type="button"
                  className="site-button secondary small touch-target"
                  onClick={handleCopyEmail}
                >
                  {copiedEmail ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedEmail ? c.aboutCopiedBtn : c.aboutCopyBtn}</span>
                </button>
                <a
                  className="site-button small touch-target"
                  href={`mailto:${c.aboutEmailAddress}`}
                >
                  <ExternalLink size={16} />
                  <span>{c.aboutEmailAction}</span>
                </a>
              </div>
            </div>

            {/* 微信公众号联系卡片 */}
            <div className="about-contact-card">
              <div className="about-contact-header">
                <div className="about-contact-icon">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <span className="about-contact-badge">{c.aboutWechatTitle}</span>
                  <div className="about-contact-value">
                    {c.aboutWechatName}{' '}
                    <span className="about-contact-subval">({c.aboutWechatAccount})</span>
                  </div>
                </div>
              </div>
              <p className="about-contact-desc">{c.aboutWechatDesc}</p>
              <div className="about-contact-actions">
                <button
                  type="button"
                  className="site-button secondary small touch-target"
                  onClick={handleCopyWechat}
                >
                  {copiedWechat ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedWechat ? c.aboutCopiedBtn : c.aboutCopyBtn}</span>
                </button>
                <button
                  type="button"
                  className="site-button small touch-target"
                  onClick={() => setShowQr(true)}
                >
                  <QrCode size={16} />
                  <span>{c.aboutWechatAction}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 底部引导 */}
        <div className="about-footer-card">
          <div>
            <h3>{isZh ? '开启你的独立手艺人线上工作室' : 'Start Your Independent Nail Studio'}</h3>
            <p>{c.inviteNote}</p>
          </div>
          <div className="about-footer-actions">
            <button
              type="button"
              className="site-button touch-target"
              onClick={() => setShowTry(true)}
            >
              {c.apply}
            </button>
            <button
              type="button"
              className="site-button secondary touch-target"
              onClick={() => setShowQr(true)}
            >
              {c.aboutWechatAction}
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
      {showQr && <ScanQrModal type="follow" onClose={() => setShowQr(false)} />}
      {showTry && <ScanQrModal type="try" onClose={() => setShowTry(false)} />}
    </div>
  )
}

function SlidersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14"></line>
      <line x1="4" y1="10" x2="4" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12" y2="3"></line>
      <line x1="20" y1="21" x2="20" y2="16"></line>
      <line x1="20" y1="12" x2="20" y2="3"></line>
      <line x1="1" y1="14" x2="7" y2="14"></line>
      <line x1="9" y1="8" x2="15" y2="8"></line>
      <line x1="17" y1="16" x2="23" y2="16"></line>
    </svg>
  )
}
