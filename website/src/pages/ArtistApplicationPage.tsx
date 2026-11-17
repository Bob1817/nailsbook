import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Check,
  ArrowUpRight,
  Loader2,
  LayoutDashboard,
  Sparkles,
  CalendarCheck,
  Users,
  ShieldCheck,
  CheckCircle2,
  Search,
  RefreshCw,
  QrCode,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'
import {
  submitArtistApplication,
  getArtistApplicationProgress,
  type ArtistApplicationProgress,
} from '../services/api'

const capabilityIcons = [LayoutDashboard, Sparkles, CalendarCheck, Users]

function maskPhone(phone: string) {
  if (!phone || phone.length < 11) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(7)
}

function getStoredApplyPhone(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem('artist_apply_phone') || ''
    }
  } catch {
    // Ignore storage errors in test or restricted environments
  }
  return ''
}

function setStoredApplyPhone(phone: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem('artist_apply_phone', phone)
    }
  } catch {
    // Ignore storage errors in test or restricted environments
  }
}

export default function ArtistApplicationPage() {
  const { lang, isZh } = useLang()
  const c = recruitment[lang]
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab =
    searchParams.get('tab') === 'progress' || searchParams.get('mode') === 'query'
      ? 'progress'
      : 'apply'
  const [activeTab, setActiveTab] = useState<'apply' | 'progress'>(initialTab)

  // Apply Form State
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [scan, setScan] = useState<'try' | 'follow' | null>(null)
  const submitting = useRef(false)

  // Query State
  const initialQueryPhone = searchParams.get('phone') || getStoredApplyPhone()
  const [queryPhone, setQueryPhone] = useState(initialQueryPhone)
  const [queryPhoneError, setQueryPhoneError] = useState('')
  const [querying, setQuerying] = useState(false)
  const [queryResult, setQueryResult] = useState<ArtistApplicationProgress | null>(null)

  const schema = z.object({
    name: z.string().trim().min(1, c.required).max(50, c.tooLong),
    phone: z
      .string()
      .trim()
      .regex(/^1[3-9]\d{9}$/, c.invalidPhone),
    city: z.string().trim().min(1, c.required).max(50, c.tooLong),
    wechat: z.string().trim().min(1, c.required).max(100, c.tooLong),
    serviceMode: z.enum(['shop', 'home', 'both'], { error: c.modeError }),
    experience: z.string().trim().max(200, c.tooLong),
    specialty: z.string().trim().max(200, c.tooLong),
    note: z.string().trim().max(1000, c.tooLong),
  })
  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      city: '',
      wechat: '',
      experience: '',
      specialty: '',
      note: '',
    },
  })

  // Synchronize URL parameters when activeTab changes
  const switchTab = (tab: 'apply' | 'progress', phoneToFill?: string) => {
    setActiveTab(tab)
    const newParams = new URLSearchParams(searchParams)
    if (tab === 'progress') {
      newParams.set('tab', 'progress')
      if (phoneToFill) newParams.set('phone', phoneToFill)
    } else {
      newParams.delete('tab')
      newParams.delete('mode')
      if (phoneToFill) setValue('phone', phoneToFill)
    }
    setSearchParams(newParams, { replace: true })
  }

  const handleQuery = async (phoneToQuery = queryPhone) => {
    const cleanPhone = phoneToQuery.trim()
    if (!/^1[3-9]\d{9}$/.test(cleanPhone)) {
      setQueryPhoneError(c.invalidPhone)
      return
    }
    setQueryPhoneError('')
    setQuerying(true)
    try {
      const res = await getArtistApplicationProgress(cleanPhone)
      setQueryResult(res)
      setStoredApplyPhone(cleanPhone)
    } catch {
      setQueryResult(null)
      setQueryPhoneError(c.error)
    } finally {
      setQuerying(false)
    }
  }

  // Auto trigger query if landing directly on progress tab with valid phone
  useEffect(() => {
    if (activeTab === 'progress' && /^1[3-9]\d{9}$/.test(queryPhone) && !queryResult) {
      handleQuery(queryPhone)
    }
  }, [activeTab])

  const onSubmit = async (values: Values) => {
    if (submitting.current) return
    submitting.current = true
    setStatus('submitting')
    try {
      await submitArtistApplication(values)
      setStoredApplyPhone(values.phone)
      setQueryPhone(values.phone)
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      submitting.current = false
    }
  }

  const fields = [
    { key: 'name', label: c.name, autoComplete: 'name', type: 'text', maxLength: 50 },
    { key: 'phone', label: c.phone, autoComplete: 'tel-national', type: 'tel', maxLength: 11 },
    { key: 'city', label: c.city, autoComplete: 'address-level2', type: 'text', maxLength: 50 },
    { key: 'wechat', label: c.wechat, autoComplete: 'off', type: 'text', maxLength: 100 },
  ] as const

  return (
    <div className="recruitment-site">
      <Meta title={c.apply} />
      <NavBar />
      <main className="site-container application-layout">
        <aside className="application-intro">
          <Link to="/" className="text-button">
            ← {c.back}
          </Link>
          <p className="eyebrow">{c.invite}</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-ink">
            {c.formTitle}
          </h1>
          <p className="section-intro mt-2 text-sm sm:text-base leading-relaxed text-ink-muted">
            {c.formIntro}
          </p>

          {/* Quick Progress Entry Banner */}
          <div className="mt-5 p-3 rounded-xl border border-line bg-surface/80 flex items-center justify-between text-xs">
            <span className="text-ink-muted">{c.hasApplication}</span>
            <button
              type="button"
              className="font-semibold text-ink hover:underline flex items-center gap-1"
              onClick={() => {
                switchTab('progress', queryPhone)
                if (/^1[3-9]\d{9}$/.test(queryPhone)) handleQuery(queryPhone)
              }}
            >
              <span>{c.checkProgressLink}</span>
            </button>
          </div>

          {/* 4 Core Capabilities Matrix */}
          <div className="mt-8 space-y-3.5">
            <h2 className="text-xs font-bold tracking-wider uppercase text-ink-muted">
              {c.capabilitiesTitle}
            </h2>
            <div className="grid gap-3">
              {c.capabilities?.map((cap, i) => {
                const Icon = capabilityIcons[i] || Sparkles
                return (
                  <div
                    key={cap.tag}
                    className="p-3.5 sm:p-4 rounded-xl border border-line bg-surface/50 transition hover:bg-surface hover:border-ink/20"
                  >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 text-ink shrink-0">
                        <Icon size={14} />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-ink">
                        {cap.tag}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-ink">
                        {cap.title}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed text-ink-muted pl-8">
                      {cap.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Guarantees / Badges */}
          <div className="mt-6 pt-5 border-t border-line">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {c.guarantees?.map((g) => (
                <div key={g} className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <CheckCircle2 size={14} className="text-ink shrink-0" />
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Step Onboarding */}
          <div className="mt-8 pt-5 border-t border-line">
            <h2 className="text-xs font-bold tracking-wider uppercase text-ink-muted mb-3">
              {c.flowTitle}
            </h2>
            <ol className="space-y-2.5">
              {c.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-3 text-xs sm:text-sm text-ink-muted">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-ink">
                    0{i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <div className="application-card">
          {/* Tab Switcher */}
          <div className="application-tab-bar" role="tablist" aria-label="申请与进度切换">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'apply'}
              className={`application-tab-item ${activeTab === 'apply' ? 'active' : ''}`}
              onClick={() => switchTab('apply')}
            >
              <FileText size={16} />
              <span>{c.tabApply}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'progress'}
              className={`application-tab-item ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => {
                switchTab('progress', queryPhone)
                if (/^1[3-9]\d{9}$/.test(queryPhone) && !queryResult) {
                  handleQuery(queryPhone)
                }
              }}
            >
              <Search size={16} />
              <span>{c.tabProgress}</span>
            </button>
          </div>

          {activeTab === 'apply' ? (
            <div>
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-ink mb-1.5">
                  {isZh ? '美甲师入驻申请登记' : 'Artist Application'}
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  {isZh
                    ? '留下您的基本情况与微信，专属顾问将在 1 个工作日内完成审核。开通后可直接免密免码授权登录。'
                    : 'Leave your contact information and our dedicated team will assist you with onboarding within 1 business day.'}
                </p>
              </div>

              {status === 'success' ? (
                <section className="application-success" role="status">
                  <span className="success-icon">
                    <Check size={28} />
                  </span>
                  <h2>{c.successTitle}</h2>
                  <p>{c.successDesc}</p>

                  <div className="my-5 p-4 rounded-xl border border-line bg-surface text-left space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-ink">
                        <Clock size={13} className="text-ink" />
                        {c.statusPending}
                      </span>
                      <span className="text-xs text-ink-muted">
                        申请手机：{maskPhone(queryPhone)}
                      </span>
                    </div>
                    <ol className="space-y-2 text-xs text-ink-muted">
                      <li className="flex items-center gap-2 font-medium text-ink">
                        <CheckCircle2 size={15} className="text-ink" />
                        <span>{c.step1Done}</span>
                      </li>
                      <li className="flex items-center gap-2 font-medium text-ink">
                        <Loader2 size={15} className="animate-spin text-ink" />
                        <span>{c.step2Pending} - 预计1个工作日内完成</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles size={15} className="text-ink-muted" />
                        <span>{c.step3Waiting} - 审核通过直接免密授权直登</span>
                      </li>
                    </ol>
                  </div>

                  <p className="contact-note">{c.successNext}</p>

                  <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-4">
                    <button
                      type="button"
                      className="site-button"
                      onClick={() => {
                        switchTab('progress', queryPhone)
                        handleQuery(queryPhone)
                      }}
                    >
                      <Search size={16} />
                      {c.checkProgress}
                    </button>
                    <button
                      type="button"
                      className="site-button secondary"
                      onClick={() => setScan('try')}
                    >
                      <QrCode size={16} />
                      {c.openMiniprogram}
                    </button>
                  </div>

                  <Link to="/" className="text-button mt-4">
                    {c.back}
                  </Link>

                  <p className="fine-print mt-3">{c.followOptional}</p>
                  <button className="text-button" onClick={() => setScan('follow')}>
                    {c.follow}
                  </button>
                </section>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={status === 'submitting'}>
                  <div className="form-grid">
                    {fields.map((field) => (
                      <div className="form-field" key={field.key}>
                        <label htmlFor={`apply-${field.key}`}>
                          {field.label}
                          <span aria-hidden="true"> *</span>
                        </label>
                        <input
                          id={`apply-${field.key}`}
                          type={field.type}
                          autoComplete={field.autoComplete}
                          maxLength={field.maxLength}
                          required
                          aria-invalid={!!errors[field.key]}
                          aria-describedby={errors[field.key] ? `error-${field.key}` : undefined}
                          {...register(field.key)}
                        />
                        {errors[field.key] && (
                          <p id={`error-${field.key}`} className="field-error" role="alert">
                            {errors[field.key]?.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="form-field">
                    <label htmlFor="apply-service-mode">
                      {c.serviceMode}
                      <span aria-hidden="true"> *</span>
                    </label>
                    <select
                      id="apply-service-mode"
                      defaultValue=""
                      required
                      aria-invalid={!!errors.serviceMode}
                      aria-describedby={errors.serviceMode ? 'error-mode' : undefined}
                      {...register('serviceMode')}
                    >
                      <option value="" disabled>
                        {c.chooseMode}
                      </option>
                      {['shop', 'home', 'both'].map((value, i) => (
                        <option key={value} value={value}>
                          {c.modes[i]}
                        </option>
                      ))}
                    </select>
                    {errors.serviceMode && (
                      <p id="error-mode" className="field-error" role="alert">
                        {errors.serviceMode.message}
                      </p>
                    )}
                  </div>
                  <details className="optional-fields">
                    <summary>
                      {c.optional}
                      <span aria-hidden="true">+</span>
                    </summary>
                    <div>
                      {(['experience', 'specialty', 'note'] as const).map((key) => (
                        <div className="form-field" key={key}>
                          <label htmlFor={`apply-${key}`}>{c[key]}</label>
                          {key === 'note' ? (
                            <textarea
                              id={`apply-${key}`}
                              rows={4}
                              maxLength={1000}
                              aria-invalid={!!errors[key]}
                              aria-describedby={errors[key] ? `error-${key}` : undefined}
                              {...register(key)}
                            />
                          ) : (
                            <input
                              id={`apply-${key}`}
                              maxLength={200}
                              aria-invalid={!!errors[key]}
                              aria-describedby={errors[key] ? `error-${key}` : undefined}
                              {...register(key)}
                            />
                          )}
                          {errors[key] && (
                            <p id={`error-${key}`} className="field-error" role="alert">
                              {errors[key]?.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                  <p className="form-purpose">
                    {c.purpose}{' '}
                    <Link to="/application-info" target="_blank" rel="noopener noreferrer">
                      {c.info} ↗
                    </Link>
                  </p>
                  {status === 'error' && (
                    <p role="alert" className="submit-error">
                      {c.error}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="site-button form-submit"
                    disabled={status === 'submitting'}
                  >
                    {status === 'submitting' ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {c.submitting}
                      </>
                    ) : (
                      <>
                        {c.submit}
                        <ArrowUpRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
                    <ShieldCheck size={14} className="text-ink shrink-0" />
                    <span>
                      {isZh
                        ? '信息严格加密 · 仅用于入驻沟通 · 不对外公开任何客户资料'
                        : 'Encrypted & confidential · Used solely for artist onboarding'}
                    </span>
                  </div>

                  <p className="fine-print form-note">{c.flowNote}</p>
                </form>
              )}
            </div>
          ) : (
            <div className="progress-query-view">
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-ink mb-1.5">
                  {c.progressTitle}
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  {c.progressIntro}
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleQuery(queryPhone)
                }}
                className="mb-6"
                noValidate
              >
                <div className="form-field">
                  <label htmlFor="query-phone-input">
                    {c.queryPhoneLabel}
                    <span aria-hidden="true"> *</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="query-phone-input"
                      type="tel"
                      maxLength={11}
                      autoComplete="tel-national"
                      placeholder={c.queryPhonePlaceholder}
                      value={queryPhone}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setQueryPhone(clean)
                        if (queryPhoneError) setQueryPhoneError('')
                      }}
                      className="flex-1"
                      aria-invalid={!!queryPhoneError}
                      aria-describedby={queryPhoneError ? 'query-phone-error' : undefined}
                    />
                    <button
                      type="submit"
                      className="site-button shrink-0"
                      disabled={querying || queryPhone.length < 11}
                    >
                      {querying ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{c.querying}</span>
                        </>
                      ) : (
                        <>
                          <Search size={16} />
                          <span>{c.queryBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                  {queryPhoneError && (
                    <p id="query-phone-error" className="field-error" role="alert">
                      {queryPhoneError}
                    </p>
                  )}
                </div>
              </form>

              {/* Result Display */}
              {queryResult && (
                <div className="query-result-block" role="region" aria-label="审核进度结果">
                  {queryResult.status === 'pending' && (
                    <div className="p-5 rounded-2xl border border-line bg-surface space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-ink">
                          <Clock size={14} />
                          {c.statusPending}
                        </span>
                        <button
                          type="button"
                          className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
                          onClick={() => handleQuery(queryPhone)}
                        >
                          <RefreshCw size={13} className={querying ? 'animate-spin' : ''} />
                          {c.refreshProgress}
                        </button>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-ink">{c.pendingTitle}</h3>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">{c.pendingDesc}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs py-3 border-y border-line text-ink-muted">
                        {queryResult.name && (
                          <div>
                            <span className="text-ink-muted">{c.applicantNameLabel}：</span>
                            <span className="font-medium text-ink">{queryResult.name}</span>
                          </div>
                        )}
                        {queryResult.city && (
                          <div>
                            <span className="text-ink-muted">{c.applicantCityLabel}：</span>
                            <span className="font-medium text-ink">{queryResult.city}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-ink-muted">手机号：</span>
                          <span className="font-medium text-ink">{maskPhone(queryPhone)}</span>
                        </div>
                        {queryResult.appliedAt && (
                          <div>
                            <span className="text-ink-muted">{c.appliedAtLabel}：</span>
                            <span className="font-medium text-ink">
                              {new Date(queryResult.appliedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <ol className="space-y-2 text-xs text-ink-muted">
                        <li className="flex items-center gap-2 font-medium text-ink">
                          <CheckCircle2 size={15} className="text-ink" />
                          <span>{c.step1Done}</span>
                        </li>
                        <li className="flex items-center gap-2 font-medium text-ink">
                          <Loader2 size={15} className="animate-spin text-ink" />
                          <span>{c.step2Pending}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles size={15} className="text-ink-muted" />
                          <span>{c.step3Waiting}</span>
                        </li>
                      </ol>
                      <div className="pt-2">
                        <button
                          type="button"
                          className="site-button secondary w-full text-xs"
                          onClick={() => setScan('try')}
                        >
                          <QrCode size={15} />
                          <span>{c.openMiniprogram}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {queryResult.status === 'approved' && (
                    <div className="p-5 sm:p-6 rounded-2xl border-2 border-ink bg-surface space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-900 text-white">
                          <CheckCircle2 size={14} />
                          {c.statusApproved}
                        </span>
                        <button
                          type="button"
                          className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
                          onClick={() => handleQuery(queryPhone)}
                        >
                          <RefreshCw size={13} className={querying ? 'animate-spin' : ''} />
                          {c.refreshProgress}
                        </button>
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-ink">
                          {c.approvedTitle}
                        </h3>
                        <p className="text-xs sm:text-sm text-ink-muted mt-1 leading-relaxed">
                          {c.approvedDesc}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-neutral-100 text-xs text-ink space-y-1.5 border border-line">
                        <p className="font-bold flex items-center gap-1.5 text-ink">
                          <ShieldCheck size={16} />
                          免密免码 · 微信一键授权登入
                        </p>
                        <p className="text-ink-muted leading-relaxed">
                          您的美甲师账号已开通就绪（绑定手机：<strong>{maskPhone(queryPhone)}</strong>）。
                          <strong>无需填写任何邀请码或密钥串</strong>。
                        </p>
                        <p className="text-ink font-semibold">
                          👉 {c.approvedActionHint}
                        </p>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-line bg-page text-center space-y-2.5">
                        <img
                          src="/miniprogram-code.jpg"
                          alt="OnlyNail 小程序码"
                          className="w-32 h-32 rounded-lg border border-line shadow-sm object-cover"
                        />
                        <p className="text-xs font-bold text-ink">OnlyNail 美甲师工作台</p>
                        <p className="text-[11px] text-ink-muted">{c.openMiniprogramDesc}</p>
                        <button
                          type="button"
                          className="site-button small w-full"
                          onClick={() => setScan('try')}
                        >
                          <QrCode size={16} />
                          <span>{c.openMiniprogram}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {queryResult.status === 'rejected' && (
                    <div className="p-5 rounded-2xl border border-line bg-surface space-y-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-ink">
                        <AlertCircle size={14} />
                        {c.statusRejected}
                      </span>
                      <h3 className="text-base font-bold text-ink">{c.rejectedTitle}</h3>
                      <p className="text-xs text-ink-muted leading-relaxed">{c.rejectedDesc}</p>
                      <div className="pt-2">
                        <button
                          type="button"
                          className="site-button w-full text-xs"
                          onClick={() => switchTab('apply')}
                        >
                          {c.reapply}
                        </button>
                      </div>
                    </div>
                  )}

                  {queryResult.status === 'none' && (
                    <div className="p-5 rounded-2xl border border-line bg-surface space-y-3 text-center">
                      <h3 className="text-base font-bold text-ink">{c.noneTitle}</h3>
                      <p className="text-xs text-ink-muted leading-relaxed">{c.noneDesc}</p>
                      <div className="pt-2">
                        <button
                          type="button"
                          className="site-button w-full text-xs"
                          onClick={() => switchTab('apply')}
                        >
                          {c.goToApply}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
      {scan && <ScanQrModal type={scan} onClose={() => setScan(null)} />}
    </div>
  )
}
