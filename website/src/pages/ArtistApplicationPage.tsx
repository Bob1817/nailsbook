import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowUpRight, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'
import { submitArtistApplication } from '../services/api'

export default function ArtistApplicationPage() {
  const { lang } = useLang()
  const c = recruitment[lang]
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [follow, setFollow] = useState(false)
  const submitting = useRef(false)
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
  const onSubmit = async (values: Values) => {
    if (submitting.current) return
    submitting.current = true
    setStatus('submitting')
    try {
      await submitArtistApplication(values)
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
          <h1>{c.formTitle}</h1>
          <p className="section-intro">{c.formIntro}</p>
          <ol className="application-steps">
            {c.steps.map((step, i) => (
              <li key={step}>
                <span>0{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </aside>
        <div className="application-card">
          {status === 'success' ? (
            <section className="application-success" role="status">
              <span className="success-icon">
                <Check size={28} />
              </span>
              <h2>{c.successTitle}</h2>
              <p>{c.successDesc}</p>
              <p className="contact-note">{c.successNext}</p>
              <Link to="/" className="site-button">
                {c.back}
                <ArrowUpRight size={18} />
              </Link>
              <p className="fine-print">{c.followOptional}</p>
              <button className="text-button" onClick={() => setFollow(true)}>
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
              <p className="fine-print form-note">{c.flowNote}</p>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
      {follow && <ScanQrModal type="follow" onClose={() => setFollow(false)} />}
    </div>
  )
}
