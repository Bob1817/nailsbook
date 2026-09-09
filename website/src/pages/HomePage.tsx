import {
  Calendar,
  MessageSquare,
  MapPin,
  Users,
  TrendingUp,
  Palette,
  MessageCircle,
  Clock,
  FileText,
  Navigation,
  Calculator,
  Sparkles,
  Smartphone,
  QrCode,
} from 'lucide-react'
import NavBar from '../components/NavBar'
import AppPreview from '../components/AppPreview'
import FeaturedWorksSection from '../components/FeaturedWorksSection'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'

const H5_URL = 'https://tech.lunails.cn'
const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(H5_URL)}`

const featureIcons = [Calendar, MessageSquare, MapPin, Users, TrendingUp, Palette]
const painIcons = [MessageCircle, Clock, FileText, Navigation, Calculator]

export default function HomePage() {
  const { t, isZh } = useLang()

  return (
    <>
      <Meta />
      <main id="top" className="min-h-screen bg-brand-bg text-ink">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-0 pt-5 md:px-10 lg:px-16">
        {/* Animated gradient blobs */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-brand/30 via-brand-soft/20 to-accent-warm/15 opacity-80 blur-3xl animate-drift" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-accent-warm/25 via-brand-soft/15 to-brand/10 opacity-70 blur-3xl animate-drift" style={{ animationDelay: '-7s' }} aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/3 top-1/2 h-[350px] w-[350px] rounded-full bg-gradient-to-tr from-brand-soft/15 via-accent-warm/10 to-transparent opacity-50 blur-3xl animate-glow-pulse" aria-hidden="true" />

        {/* Nav */}
        <div className="sticky top-4 z-40">
          <NavBar />
        </div>

        {/* Hero content */}
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand-soft/60 bg-surface/80 px-4 py-2 text-[13px] font-bold text-brand backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t.hero.badge}
            </div>

            {/* Headline */}
            <h1 className="mt-6 max-w-[600px] text-[clamp(2.25rem,5vw,4rem)] font-black leading-[1.05] tracking-tight text-ink">
              {t.hero.headline1}
              <br />
              <span className="text-gradient-brand">{t.hero.headline2}</span>
              {isZh ? '' : ' '}
              {t.hero.headline3}
            </h1>

            <p className="mt-6 max-w-[500px] text-[15px] leading-[1.7] text-ink-muted sm:text-base">
              {t.hero.desc}
            </p>

            {/* QR Code CTA */}
            <div className="mt-8 flex max-w-[500px] items-center gap-4 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-sm sm:p-5">
              <img
                src={QR_CODE_URL}
                alt={t.footer.scanQr}
                width={100}
                height={100}
                className="rounded-lg"
                loading="lazy"
              />
              <div>
                <p className="text-[14px] font-bold text-ink sm:text-[15px]">{t.footer.scanQr}</p>
                <p className="mt-1 text-[12px] text-ink-muted sm:text-[13px]">{t.footer.scanHint}</p>
              </div>
            </div>

            {/* Trust chips */}
            <div className="mt-6 flex flex-wrap gap-2 sm:mt-9 sm:gap-3">
              {t.hero.trust.map((item) => (
                <div
                  key={item}
                  className="rounded-xl bg-surface/80 px-3 py-2 text-[12px] font-bold text-ink-muted shadow-sm backdrop-blur-sm sm:px-4 sm:py-2.5 sm:text-[13px]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <AppPreview />
          </div>
        </div>
      </section>

      {/* ── Product Stats Bar ── */}
      <section className="px-4 py-8 md:px-10 md:py-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-line bg-surface p-4 shadow-sm sm:gap-4 sm:rounded-[28px] sm:p-6 md:grid-cols-4 md:gap-0 md:p-0 md:bg-transparent md:border-0 md:shadow-none">
            {t.stats.items.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center justify-center rounded-2xl bg-surface p-4 shadow-sm sm:p-5 md:shadow-none md:bg-transparent md:py-6 ${
                  i < t.stats.items.length - 1 ? 'md:border-r md:border-line' : ''
                }`}
              >
                <div className={`text-2xl font-black tracking-tight animate-count-up sm:text-3xl`} style={{ animationDelay: `${i * 100}ms` }}>
                  <span className="text-gradient-brand">{stat.value}</span>
                  {stat.suffix && <span className="text-base text-ink-muted sm:text-lg">{stat.suffix}</span>}
                </div>
                <p className="mt-1 text-[12px] font-medium text-ink-muted sm:text-[13px]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why NailBook ── */}
      <section
        id="audience"
        className="px-4 py-12 md:px-10 md:py-16 lg:px-16"
        style={{ scrollMarginTop: '5rem' }}
      >
        <div className="mx-auto max-w-6xl rounded-[28px] border border-line bg-surface p-6 shadow-sm sm:rounded-[36px] sm:p-8 md:p-14">
          <p className="text-xs font-black tracking-[0.1em] text-brand uppercase">{t.why.tag}</p>
          <h2 className="mt-4 text-[clamp(1.5rem,3.5vw,2.75rem)] font-black leading-[1.1] tracking-tight text-ink">
            {t.why.title}
          </h2>
          <p className="mt-4 max-w-[65ch] text-[14px] leading-[1.7] text-ink-muted sm:text-[15px]">
            {t.why.desc}
          </p>
          <div className="mt-8 grid gap-2 sm:gap-3 sm:grid-cols-2 md:mt-10 md:grid-cols-3 lg:grid-cols-5">
            {t.why.pains.map((pain, i) => {
              const Icon = painIcons[i] || MessageCircle
              return (
                <div key={pain.label} className="flex items-center gap-3 rounded-2xl border border-line bg-brand-bg p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-soft-pink to-brand-mist sm:h-10 sm:w-10" aria-hidden="true">
                    <Icon className="h-4 w-4 text-brand sm:h-5 sm:w-5" />
                  </div>
                  <p className="text-[14px] font-bold text-ink sm:text-[15px]">{pain.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        className="px-4 py-12 md:px-10 md:py-16 lg:px-16"
        style={{ scrollMarginTop: '5rem' }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end md:gap-5">
            <div>
              <p className="text-xs font-black tracking-[0.1em] text-brand uppercase">{t.features.tag}</p>
              <h2 className="mt-4 text-[clamp(1.5rem,3.5vw,2.75rem)] font-black tracking-tight text-ink">
                {t.features.title}
              </h2>
            </div>
            <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted sm:text-sm">
              {t.features.desc}
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 md:mt-10 lg:grid-cols-3">
            {t.features.items.map((feature, i) => {
              const Icon = featureIcons[i] || Calendar
              return (
                <article
                  key={feature.title}
                  className="group rounded-[20px] border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 sm:rounded-[24px] sm:p-7"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-soft-pink to-brand-mist transition group-hover:from-brand/20 group-hover:to-accent-warm/15 sm:h-12 sm:w-12" aria-hidden="true">
                      <Icon className="h-4 w-4 text-brand sm:h-5 sm:w-5" />
                    </div>
                    <h3 className="text-base font-black tracking-tight text-ink sm:text-lg">{feature.title}</h3>
                  </div>
                  <p className="mt-3 text-[13px] leading-[1.7] text-ink-muted sm:mt-4 sm:text-[14px]">{feature.desc}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Featured Works (live from API) ── */}
      <FeaturedWorksSection />

      {/* ── Booking Flow ── */}
      <section
        id="flow"
        className="px-4 py-12 md:px-10 md:py-16 lg:px-16"
        style={{ scrollMarginTop: '5rem' }}
      >
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-sm sm:rounded-[36px] sm:p-8 md:p-14">
          <p className="text-xs font-black tracking-[0.1em] text-brand uppercase">{t.flow.tag}</p>
          <h2 className="mt-4 text-[clamp(1.5rem,3.5vw,2.75rem)] font-black tracking-tight text-ink">{t.flow.title}</h2>
          <p className="mt-3 max-w-[440px] text-[14px] leading-relaxed text-ink-muted sm:mt-4 sm:text-sm">
            {t.flow.desc}
          </p>
          <div className="mt-8 grid gap-2 sm:gap-3 sm:grid-cols-2 md:mt-10 md:grid-cols-3 lg:grid-cols-6">
            {t.flow.steps.map((step, index) => (
              <div key={step} className="relative rounded-2xl border border-line bg-brand-bg p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-deep text-[12px] font-black text-white sm:h-8 sm:w-8 sm:text-[13px]">
                  {index + 1}
                </div>
                <p className="mt-3 text-[12px] font-bold leading-relaxed text-ink sm:mt-4 sm:text-[13px]">{step}</p>
                {index < t.flow.steps.length - 1 && (
                  <div className="absolute -right-2 top-7 hidden h-[2px] w-4 bg-gradient-to-r from-brand/40 to-transparent lg:block sm:top-8" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing — 邀请体验期间暂时隐藏 ── */}

      {/* ── Final CTA ── */}
      <section className="px-4 pb-16 pt-6 md:px-10 md:pb-20 lg:px-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-brand via-brand-deep to-accent-warm p-6 text-white sm:rounded-[36px] sm:p-8 md:flex-row md:gap-8 md:p-14">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium opacity-90">
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              {t.finalCta.subtitle}
            </div>
            <h2 className="mt-3 text-[clamp(1.5rem,3.5vw,2.75rem)] font-black tracking-tight sm:mt-4">
              {t.finalCta.title}
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-lg">
              <img
                src={QR_CODE_URL}
                alt={t.footer.scanQr}
                width={120}
                height={120}
                className="rounded-lg"
                loading="lazy"
              />
            </div>
            <p className="text-[13px] font-medium opacity-90">{t.footer.scanHint}</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-line px-5 py-10 text-center">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent-warm text-white select-none">
              <QrCode className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-black tracking-[0.12em] text-ink">贝美甲</span>
          </div>
          <p className="mt-4 text-[13px] text-ink-soft">
            {t.footer.copyright}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft/70">
            {t.footer.tagline}
          </p>
          <p className="mt-4 text-[12px] text-ink-soft/60">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-brand"
            >
              {t.footer.icp}
            </a>
          </p>
        </div>
      </footer>
    </main>
    </>
  )
}
