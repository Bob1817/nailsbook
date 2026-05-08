import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock3,
  LogIn,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'
import { getFeaturedWorks } from '../services/api'

interface FeaturedWork {
  id: number
  title: string
  coverUrl: string | null
  images: string
  tags: string
  technician: { id: number; name: string; avatarUrl: string | null; city: string | null }
}

interface ShowcaseCard {
  title: string
  artist: string
  location: string
  tags: string[]
  blurb: string
}

const fallbackWorks: ShowcaseCard[] = [
  {
    title: '奶油白法式渐变',
    artist: 'Luna Studio',
    location: 'Pasadena',
    tags: ['新娘预约', '法式渐变', '45 分钟沟通确认'],
    blurb: '轻透底色配合细闪收边，适合第一次升级基础款，也适合婚礼前想要稳定发挥的客户。',
  },
  {
    title: '镜面银杏短甲',
    artist: 'Mori Nails',
    location: 'Arcadia',
    tags: ['短甲友好', '金属镜面', '到店服务'],
    blurb: '把金属感压到更耐看的一档，证明短甲并不需要牺牲完成度和辨识度。',
  },
  {
    title: '夏日糖果手绘',
    artist: 'Atelier Suki',
    location: 'Alhambra',
    tags: ['手绘定制', '节日主题', '上门服务'],
    blurb: '彩绘、跳色和主题配件拆解得很清楚，适合想提前确认过程和预算范围的客户。',
  },
]

const serviceTags: string[] = ['手绘定制', '短甲改造', '新娘预约', '猫眼磁吸', '上门服务', '工作室接待']

const proofPoints = [
  {
    icon: BadgeCheck,
    title: '作品先讲清楚风格',
    description: '每张卡片都强调适合谁、适合什么场景，而不是只给一个漂亮结果图。',
  },
  {
    icon: Clock3,
    title: '服务过程有预期',
    description: '从款式沟通、时长评估到预约方式，公开信息先减少一次来回确认。',
  },
  {
    icon: ShieldCheck,
    title: '信任感来自细节',
    description: '城市、服务方式和风格标签一起出现，更接近真实客户判断是否要预约的顺序。',
  },
]

const processSteps = [
  {
    step: '01',
    title: '先看风格匹配',
    description: '客户先判断审美是不是自己会保存和转发的类型，再决定要不要继续问价和排期。',
  },
  {
    step: '02',
    title: '再看服务方式',
    description: '到店、上门、工作室接待分开表达，减少因为服务边界不清导致的咨询流失。',
  },
  {
    step: '03',
    title: '最后再进入预约',
    description: '作品展示不是商城货架，而是帮助客户更自然地进入信任和预约动作。',
  },
]

const ShowcasePage = () => {
  const [apiWorks, setApiWorks] = useState<FeaturedWork[]>([])

  useEffect(() => {
    getFeaturedWorks()
      .then(setApiWorks)
      .catch(() => {}) // silently fall back to static data
  }, [])

  const displayWorks: ShowcaseCard[] = apiWorks.length > 0
    ? apiWorks.map((w) => ({
        title: w.title,
        artist: w.technician?.name || '美甲师',
        location: w.technician?.city || '',
        tags: w.tags ? (JSON.parse(w.tags) as string[]) : [],
        blurb: '',
      }))
    : fallbackWorks

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
              <div className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgba(255,240,243,0.92)] px-4 text-sm font-medium text-[var(--color-brand)]">
                <Sparkles className="h-4 w-4" />
                Public Showcase
              </div>
              <h1 className="mt-4 text-[2rem] leading-[1.08] font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
                不是作品商城，而是让客户更快判断“这位美甲师适不适合我”。
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--color-ink-muted)]">
                这里保留公开站点该有的证明感: 作品、风格标签、服务方式和过程信息都明确可见，但仍然是静态内容页，不承担真实交易。
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-[0_24px_56px_rgba(192,136,148,0.1)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">精选作品</h2>
              <span className="text-xs text-[var(--color-ink-soft)]">{apiWorks.length > 0 ? '实时更新' : '精选推荐'}</span>
            </div>
            <div className="mt-4 space-y-4">
              {displayWorks.map((work) => (
                <article
                  key={work.title}
                  className="overflow-hidden rounded-[1.8rem] border border-[rgba(255,107,138,0.1)] bg-[rgba(255,250,251,0.96)]"
                >
                  <div className="aspect-[4/3] bg-[linear-gradient(135deg,rgba(255,228,233,0.95),rgba(255,244,246,0.92),rgba(255,214,222,0.86))]" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--color-ink)]">{work.title}</h3>
                        <p className="mt-1 text-sm text-[var(--color-brand)]">{work.artist}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-ink-muted)] shadow-[0_8px_20px_rgba(192,136,148,0.08)]">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        推荐
                      </div>
                    </div>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs text-[var(--color-ink-muted)]">
                      <MapPin className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                      {work.location}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {work.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex min-h-9 items-center rounded-full bg-[rgba(255,240,243,0.92)] px-3 text-xs font-medium text-[var(--color-brand)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[var(--color-ink-muted)]">{work.blurb}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-[0_24px_56px_rgba(192,136,148,0.1)]">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">风格与服务标签</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {serviceTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex min-h-11 items-center rounded-full bg-[rgba(255,240,243,0.92)] px-4 text-sm font-medium text-[var(--color-brand)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-[0_24px_56px_rgba(192,136,148,0.1)]">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">为什么这些内容能建立信任</h2>
            <div className="mt-4 space-y-3">
              {proofPoints.map((item) => {
                const Icon = item.icon

                return (
                  <article
                    key={item.title}
                    className="rounded-[1.5rem] border border-[rgba(255,107,138,0.1)] bg-[rgba(255,250,251,0.92)] px-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-white text-[var(--color-brand)] shadow-[0_10px_22px_rgba(192,136,148,0.08)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-[0_24px_56px_rgba(192,136,148,0.1)]">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">公开页中的服务流程证明</h2>
            <div className="mt-4 space-y-3">
              {processSteps.map((step) => (
                <article
                  key={step.step}
                  className="rounded-[1.5rem] border border-[rgba(255,107,138,0.1)] bg-[rgba(255,250,251,0.92)] px-4 py-4"
                >
                  <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-brand)] uppercase">
                    Step {step.step}
                  </p>
                  <h3 className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">{step.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_56px_rgba(192,136,148,0.08)]">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">已经准备好登录？</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
                如果你已经知道自己要进入哪个工作空间，直接前往角色登录，不需要在公开页停留太久。
              </p>
              <Link
                to="/role-select"
                className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-soft))] px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(255,107,138,0.22)] transition active:scale-[0.99] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <LogIn className="h-4 w-4" />
                前往登录
              </Link>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_56px_rgba(192,136,148,0.08)]">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">你是美甲师？</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
                可以先通过入驻页提交基础资料，模拟完整业务门面建立前的第一步转化。
              </p>
              <Link
                to="/artist-join"
                className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border border-[rgba(255,107,138,0.12)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] transition active:scale-[0.99] active:bg-[rgba(255,250,251,0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                申请入驻
                <ArrowRight className="h-4 w-4 text-[var(--color-brand)]" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default ShowcasePage
