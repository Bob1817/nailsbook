import { useState } from 'react'
import { ArrowLeft, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Meta } from '../components/Meta'
import { useLang } from '../i18n/LanguageContext'
import { submitArtistApplication, checkPhoneStatus, type ApplicationStatus } from '../services/api'

const createSchema = (t: any) => z.object({
  name: z.string().min(1, t.apply.validation?.nameRequired || '请输入姓名'),
  phone: z.string().min(1, t.apply.validation?.phoneRequired || '请输入手机号'),
  city: z.string().min(1, t.apply.validation?.cityRequired || '请输入城市'),
  wechat: z.string().min(1, t.apply.validation?.wechatRequired || '请输入微信号'),
  serviceMode: z.string().optional(),
  experience: z.string().optional(),
  specialty: z.string().optional(),
  note: z.string().optional(),
})

type FormData = z.infer<ReturnType<typeof createSchema>>

export default function ArtistApplicationPage() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'checking' | 'submitting' | 'success' | 'error' | 'phone_exists'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [phoneStatus, setPhoneStatus] = useState<ApplicationStatus>('none')

  const schema = createSchema(t)
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      phone: '',
      city: '',
      wechat: '',
      serviceMode: '',
      experience: '',
      specialty: '',
      note: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setStatus('checking')
    setErrorMsg('')
    
    try {
      // 先检查手机号状态
      const checkResult = await checkPhoneStatus(data.phone)
      
      if (checkResult.status === 'pending') {
        setPhoneStatus('pending')
        setStatus('phone_exists')
        return
      }
      
      if (checkResult.status === 'approved') {
        setPhoneStatus('approved')
        setStatus('phone_exists')
        return
      }
      
      // 手机号未被注册，继续提交申请
      setStatus('submitting')
      await submitArtistApplication(data)
      setStatus('success')
    } catch (err: any) {
      setErrorMsg(err.message || 'Unknown error')
      setStatus('error')
    }
  }

  const required = (label: string) => (
    <span className="text-[12px] font-bold text-ink sm:text-[13px]">
      {label} <span className="text-brand">*</span>
    </span>
  )

  const optional = (label: string) => (
    <span className="text-[12px] font-bold text-ink sm:text-[13px]">
      {label} <span className="text-ink-soft text-[10px] sm:text-[11px]">({t.apply.optional})</span>
    </span>
  )

  const inputClass = (error?: boolean) =>
    `w-full rounded-2xl border ${error ? 'border-[var(--nb-control)]' : 'border-line'} bg-brand-bg px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10 sm:px-4 sm:py-3 sm:text-[14px]`

  if (status === 'success') {
    return (
      <>
        <Meta title={t.apply.title} />
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4">
          <div className="mx-auto w-full max-w-md rounded-[24px] border border-line bg-surface p-6 text-center shadow-lg sm:rounded-[32px] sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nb-page)] sm:h-16 sm:w-16">
              <CheckCircle className="h-7 w-7 text-[var(--nb-secondary)] sm:h-8 sm:w-8" />
            </div>
            <h2 className="mt-5 text-lg font-black text-ink sm:mt-6 sm:text-xl">{t.apply.success}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted sm:mt-3 sm:text-[14px]">{t.apply.successDesc}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-6 text-[14px] font-bold text-white shadow-lg shadow-black/50 transition hover:-translate-y-0.5 active:scale-[0.98] sm:mt-8 sm:min-h-12 sm:text-[15px]"
            >
              {t.apply.backHome}
            </button>
          </div>
        </div>
      </>
    )
  }

  if (status === 'phone_exists') {
    return (
      <>
        <Meta title={t.apply.title} />
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4">
          <div className="mx-auto w-full max-w-md rounded-[24px] border border-line bg-surface p-6 text-center shadow-lg sm:rounded-[32px] sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nb-page)] sm:h-16 sm:w-16">
              <AlertCircle className="h-7 w-7 text-[var(--nb-secondary)] sm:h-8 sm:w-8" />
            </div>
            <h2 className="mt-5 text-lg font-black text-ink sm:mt-6 sm:text-xl">{t.apply.phoneExists}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted sm:mt-3 sm:text-[14px]">
              {phoneStatus === 'pending' ? t.apply.phonePending : t.apply.phoneApproved}
            </p>
            {phoneStatus === 'approved' && (
              <a
                href="https://tech.lunails.cn"
                className="mt-3 inline-block text-[13px] font-bold text-brand underline hover:text-brand-deep sm:mt-4 sm:text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.apply.clickToLogin}
              </a>
            )}
            <div className="mt-6 flex gap-3 sm:mt-8">
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-6 text-[14px] font-bold text-white shadow-lg transition active:scale-[0.98] sm:min-h-12 sm:text-[15px]"
              >
                {t.apply.submit}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-6 text-[14px] font-bold text-ink transition active:scale-[0.98] sm:min-h-12 sm:text-[15px]"
              >
                {t.apply.backHome}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <Meta title={t.apply.title} />
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4">
          <div className="mx-auto w-full max-w-md rounded-[24px] border border-line bg-surface p-6 text-center shadow-lg sm:rounded-[32px] sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nb-page)] sm:h-16 sm:w-16">
              <XCircle className="h-7 w-7 text-[var(--nb-secondary)] sm:h-8 sm:w-8" />
            </div>
            <h2 className="mt-5 text-lg font-black text-ink sm:mt-6 sm:text-xl">{t.apply.error}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted sm:mt-3 sm:text-[14px]">{t.apply.errorDesc}</p>
            {errorMsg && (
              <p className="mt-2 rounded-xl bg-[var(--nb-page)] px-4 py-2 text-[11px] text-[var(--nb-secondary)] sm:text-[12px]">{errorMsg}</p>
            )}
            <div className="mt-6 flex gap-3 sm:mt-8">
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-6 text-[14px] font-bold text-white shadow-lg transition active:scale-[0.98] sm:min-h-12 sm:text-[15px]"
              >
                {t.apply.submit}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-6 text-[14px] font-bold text-ink transition active:scale-[0.98] sm:min-h-12 sm:text-[15px]"
              >
                {t.apply.backHome}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Meta title={t.apply.title} />
      <div className="min-h-screen bg-brand-bg px-4 py-6 sm:py-8">
      <div className="mx-auto w-full max-w-lg">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1.5 text-[12px] font-medium text-ink-muted backdrop-blur-sm transition hover:text-brand sm:mb-6 sm:px-4 sm:py-2 sm:text-[13px]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.apply.backHome}
        </button>

        {/* Form card */}
        <div className="rounded-[24px] border border-line bg-surface p-6 shadow-lg sm:rounded-[32px] sm:p-8 md:p-10">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl font-black tracking-tight text-ink sm:text-2xl">{t.apply.title}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted sm:text-[14px]">{t.apply.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="apply-name" className="mb-1.5 block">{required(t.apply.name)}</label>
              <input
                id="apply-name"
                type="text"
                placeholder={t.apply.namePlaceholder}
                className={inputClass(!!errors.name)}
                aria-describedby={errors.name ? 'apply-name-error' : undefined}
                {...register('name')}
              />
              {errors.name && (
                <p id="apply-name-error" className="mt-1 text-xs text-[var(--nb-secondary)]" role="alert">
                  {errors.name.message as string}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="apply-phone" className="mb-1.5 block">{required(t.apply.phone)}</label>
              <input
                id="apply-phone"
                type="tel"
                placeholder={t.apply.phonePlaceholder}
                className={inputClass(!!errors.phone)}
                aria-describedby={errors.phone ? 'apply-phone-error' : undefined}
                {...register('phone')}
              />
              {errors.phone && (
                <p id="apply-phone-error" className="mt-1 text-xs text-[var(--nb-secondary)]" role="alert">
                  {errors.phone.message as string}
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label htmlFor="apply-city" className="mb-1.5 block">{required(t.apply.city)}</label>
              <input
                id="apply-city"
                type="text"
                placeholder={t.apply.cityPlaceholder}
                className={inputClass(!!errors.city)}
                aria-describedby={errors.city ? 'apply-city-error' : undefined}
                {...register('city')}
              />
              {errors.city && (
                <p id="apply-city-error" className="mt-1 text-xs text-[var(--nb-secondary)]" role="alert">
                  {errors.city.message as string}
                </p>
              )}
            </div>

            {/* WeChat */}
            <div>
              <label htmlFor="apply-wechat" className="mb-1.5 block">{required(t.apply.wechat)}</label>
              <input
                id="apply-wechat"
                type="text"
                placeholder={t.apply.wechatPlaceholder}
                className={inputClass(!!errors.wechat)}
                aria-describedby={errors.wechat ? 'apply-wechat-error' : undefined}
                {...register('wechat')}
              />
              {errors.wechat && (
                <p id="apply-wechat-error" className="mt-1 text-xs text-[var(--nb-secondary)]" role="alert">
                  {errors.wechat.message as string}
                </p>
              )}
            </div>

            {/* Service Mode */}
            <div>
              <label htmlFor="apply-service-mode" className="mb-1.5 block">{optional(t.apply.serviceMode)}</label>
              <input
                id="apply-service-mode"
                type="text"
                placeholder={t.apply.serviceModePlaceholder}
                className={inputClass()}
                {...register('serviceMode')}
              />
            </div>

            {/* Experience */}
            <div>
              <label htmlFor="apply-experience" className="mb-1.5 block">{optional(t.apply.experience)}</label>
              <input
                id="apply-experience"
                type="text"
                placeholder={t.apply.experiencePlaceholder}
                className={inputClass()}
                {...register('experience')}
              />
            </div>

            {/* Specialty */}
            <div>
              <label htmlFor="apply-specialty" className="mb-1.5 block">{optional(t.apply.specialty)}</label>
              <input
                id="apply-specialty"
                type="text"
                placeholder={t.apply.specialtyPlaceholder}
                className={inputClass()}
                {...register('specialty')}
              />
            </div>

            {/* Note */}
            <div>
              <label htmlFor="apply-note" className="mb-1.5 block">{optional(t.apply.note)}</label>
              <textarea
                id="apply-note"
                placeholder={t.apply.notePlaceholder}
                rows={3}
                className={inputClass() + ' resize-none'}
                {...register('note')}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'checking' || status === 'submitting' || !isValid}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-deep px-6 text-[14px] font-bold text-white shadow-lg shadow-black/50 transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed sm:min-h-12 sm:text-[15px]"
            >
              {status === 'checking' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.apply.checking || '检查中...'}
                </>
              ) : status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.apply.submitting}
                </>
              ) : (
                t.apply.submit
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  )
}
