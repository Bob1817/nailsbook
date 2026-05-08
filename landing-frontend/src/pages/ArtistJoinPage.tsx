import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Home, LogIn, Sparkles } from 'lucide-react'
import { submitArtistApplication } from '../services/api'

const serviceModes = ['到店服务', '上门服务', '工作室 + 上门']

const experienceOptions = ['0-1 年', '1-3 年', '3-5 年', '5 年以上']

const defaultServiceMode = serviceModes[0]

const defaultExperience = experienceOptions[1]

const specialties = ['日系清透', '法式与裸色', '手绘设计', '猫眼/磁吸', '新娘预约', '短甲改造']

const joinReasons = [
  '想先留下线索，后续补全作品和服务资料',
  '希望集中管理预约、客户偏好和作品展示',
  '更适合个人美甲师和小型工作室的轻量经营方式',
]

const ArtistJoinPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [selectedMode, setSelectedMode] = useState(defaultServiceMode)
  const [selectedExperience, setSelectedExperience] = useState(defaultExperience)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    setSubmitting(true)
    setError('')
    try {
      await submitArtistApplication({
        name: formData.get('artistName') as string,
        phone: formData.get('phone') as string,
        city: formData.get('city') as string,
        serviceMode: formData.get('serviceMode') as string,
        experience: formData.get('experience') as string,
        specialty: formData.get('specialty') as string,
        note: formData.get('note') as string,
      })
      setIsSubmitted(true)
    } catch {
      setError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetForm = () => {
    setSelectedMode(defaultServiceMode)
    setSelectedExperience(defaultExperience)
    setIsSubmitted(false)
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-12 pt-4 sm:px-6">
        <header className="flex items-center justify-between py-2">
          <Link
            to="/"
            className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-[var(--color-ink-muted)] transition active:scale-[0.98] active:bg-white/92 active:shadow-[0_10px_24px_rgba(192,136,148,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <Link
            to="/role-select"
            className="inline-flex min-h-11 items-center rounded-full bg-white/82 px-4 text-sm font-medium text-[var(--color-brand)] shadow-[0_12px_24px_rgba(192,136,148,0.08)] transition active:scale-[0.98] active:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          >
            角色登录
          </Link>
        </header>

        <main className="flex flex-1 flex-col gap-5 pt-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,247,248,0.9))] px-5 py-6 shadow-[0_24px_56px_rgba(192,136,148,0.12)]">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,143,163,0.24),transparent_68%)]" />
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-soft))] text-white shadow-[0_16px_32px_rgba(255,107,138,0.24)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium tracking-[0.18em] text-[var(--color-brand)] uppercase">
                Artist Join
              </p>
              <h1 className="mt-3 text-[2rem] leading-[1.08] font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
                先留下你的服务信息，让 NailBook 评估是否适合成为你的业务门面。
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--color-ink-muted)]">
                填写基础资料提交入驻申请，我们会尽快审核并与你联系。
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white/90 p-5 shadow-[0_24px_56px_rgba(192,136,148,0.1)]">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">适合先提交什么</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-ink-muted)]">
              {joinReasons.map((reason) => (
                <li
                  key={reason}
                  className="rounded-[1.4rem] border border-[rgba(255,107,138,0.1)] bg-[rgba(255,250,251,0.92)] px-4 py-3"
                >
                  {reason}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-[0_24px_56px_rgba(192,136,148,0.1)]">
            {isSubmitted ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(74,222,128,0.16)]">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
                    已收到你的入驻意向
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-ink-muted)]">
                    我们已收到你的入驻申请，会尽快审核并与你联系。你可以返回首页继续浏览，或直接进入角色登录入口。
                  </p>
                </div>

                <div className="rounded-[1.6rem] border border-[rgba(255,107,138,0.1)] bg-[rgba(255,250,251,0.92)] px-4 py-4 text-left">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">接下来会看到的内容</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
                    服务方式、经验和风格标签已经完成前端收集。后续可继续补作品图、服务半径、价格策略和可预约档期。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full rounded-full bg-[rgba(255,240,243,0.92)] px-4 py-3 text-sm font-semibold text-[var(--color-brand)] transition active:scale-[0.99] active:bg-[rgba(255,228,233,0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  重新填写资料
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[rgba(255,107,138,0.12)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] transition active:scale-[0.99] active:bg-[rgba(255,250,251,0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    <Home className="h-4 w-4" />
                    返回首页
                  </Link>
                  <Link
                    to="/role-select"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-soft))] px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(255,107,138,0.22)] transition active:scale-[0.99] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    <LogIn className="h-4 w-4" />
                    前往角色登录
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]" htmlFor="artist-name">
                    姓名
                  </label>
                  <input
                    id="artist-name"
                    name="artistName"
                    type="text"
                    placeholder="例如：Luna / Luna Studio"
                    required
                    className="min-h-12 w-full rounded-[1.35rem] border border-[rgba(255,107,138,0.12)] bg-[rgba(255,250,251,0.92)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]" htmlFor="artist-phone">
                    手机号
                  </label>
                  <input
                    id="artist-phone"
                    name="phone"
                    type="tel"
                    placeholder="用于后续联系，例如 138 0000 0000"
                    required
                    className="min-h-12 w-full rounded-[1.35rem] border border-[rgba(255,107,138,0.12)] bg-[rgba(255,250,251,0.92)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]" htmlFor="artist-city">
                    所在城市
                  </label>
                  <input
                    id="artist-city"
                    name="city"
                    type="text"
                    placeholder="例如：上海 / San Gabriel"
                    required
                    className="min-h-12 w-full rounded-[1.35rem] border border-[rgba(255,107,138,0.12)] bg-[rgba(255,250,251,0.92)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]" htmlFor="artist-service-mode">
                    服务方式
                  </label>
                  <select
                    id="artist-service-mode"
                    name="serviceMode"
                    value={selectedMode}
                    onChange={(event) => setSelectedMode(event.target.value)}
                    className="min-h-12 w-full rounded-[1.35rem] border border-[rgba(255,107,138,0.12)] bg-[rgba(255,250,251,0.92)] px-4 py-3 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    {serviceModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]" htmlFor="artist-experience">
                    从业经验
                  </label>
                  <select
                    id="artist-experience"
                    name="experience"
                    value={selectedExperience}
                    onChange={(event) => setSelectedExperience(event.target.value)}
                    className="min-h-12 w-full rounded-[1.35rem] border border-[rgba(255,107,138,0.12)] bg-[rgba(255,250,251,0.92)] px-4 py-3 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    {experienceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]" htmlFor="artist-specialty">
                    风格特长
                  </label>
                  <input
                    id="artist-specialty"
                    name="specialty"
                    type="text"
                    placeholder="例如：日系清透、法式、手绘、新娘预约"
                    list="artist-specialty-options"
                    required
                    className="min-h-12 w-full rounded-[1.35rem] border border-[rgba(255,107,138,0.12)] bg-[rgba(255,250,251,0.92)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  />
                  <datalist id="artist-specialty-options">
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]" htmlFor="artist-note">
                    备注 / 补充信息
                  </label>
                  <textarea
                    id="artist-note"
                    name="note"
                    rows={5}
                    placeholder="可以补充服务区域、擅长款式、工作室情况，或你最希望用 NailBook 解决的问题。"
                    className="w-full rounded-[1.35rem] border border-[rgba(255,107,138,0.12)] bg-[rgba(255,250,251,0.92)] px-4 py-3 text-sm leading-6 text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-soft))] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(255,107,138,0.22)] transition active:scale-[0.99] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
                >
                  {submitting ? '提交中...' : '提交入驻申请'}
                </button>
              </form>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

export default ArtistJoinPage
