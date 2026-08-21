import { useState } from 'react'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLang } from '../i18n/LanguageContext'
import { Meta } from '../components/Meta'

const createSchema = (t: any) =>
  z.object({
    name: z.string().min(1, t.apply.validation?.nameRequired || '请输入姓名'),
    email: z.string().email('请输入有效的邮箱地址'),
    message: z.string().min(1, '请输入留言'),
  })

type FormData = z.infer<ReturnType<typeof createSchema>>

export default function ContactPage() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

  const schema = createSchema(t)
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
  })

  const onSubmit = async (_data: FormData) => {
    setStatus('submitting')
    // Simulate API call
    setTimeout(() => {
      setStatus('success')
    }, 1000)
  }

  if (status === 'success') {
    return (
      <>
        <Meta title={t.contact.title} />
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4">
          <div className="mx-auto w-full max-w-md rounded-[32px] border border-line bg-surface p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="mt-6 text-xl font-black text-ink">{t.contact.success}</h2>
            <p className="mt-2 text-sm text-ink-muted">{t.contact.successDesc}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-6 text-sm font-bold text-white shadow-lg shadow-pink-200/50 transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {t.contact.backHome}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Meta title={t.contact.title} />
      <div className="min-h-screen bg-brand-bg">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 md:px-10">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-ink-muted transition hover:text-brand active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-ink">{t.contact.title}</h1>
              <p className="text-[12px] text-ink-soft">{t.contact.subtitle}</p>
            </div>
          </div>
        </header>

        {/* Form */}
        <div className="mx-auto max-w-lg px-5 py-8 md:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-ink">
                {t.contact.name}
              </label>
              <input
                id="contact-name"
                type="text"
                placeholder={t.contact.namePlaceholder}
                className={`w-full rounded-2xl border ${
                  errors.name ? 'border-red-400' : 'border-line'
                } bg-brand-bg px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10`}
                aria-describedby={errors.name ? 'contact-name-error' : undefined}
                {...register('name')}
              />
              {errors.name && (
                <p id="contact-name-error" className="mt-1 text-xs text-red-500" role="alert">
                  {errors.name.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-ink">
                {t.contact.email}
              </label>
              <input
                id="contact-email"
                type="email"
                placeholder={t.contact.emailPlaceholder}
                className={`w-full rounded-2xl border ${
                  errors.email ? 'border-red-400' : 'border-line'
                } bg-brand-bg px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10`}
                aria-describedby={errors.email ? 'contact-email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="contact-email-error" className="mt-1 text-xs text-red-500" role="alert">
                  {errors.email.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-ink">
                {t.contact.message}
              </label>
              <textarea
                id="contact-message"
                placeholder={t.contact.messagePlaceholder}
                rows={5}
                className={`w-full rounded-2xl border ${
                  errors.message ? 'border-red-400' : 'border-line'
                } bg-brand-bg px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10 resize-none`}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                {...register('message')}
              />
              {errors.message && (
                <p id="contact-message-error" className="mt-1 text-xs text-red-500" role="alert">
                  {errors.message.message as string}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'submitting' || !isValid}
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-deep px-6 text-sm font-bold text-white shadow-lg shadow-pink-200/50 transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.contact.submitting}
                </>
              ) : (
                t.contact.submit
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
