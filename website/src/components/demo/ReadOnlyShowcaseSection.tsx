import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  Clock,
  Eye,
  MapPin,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { trackDemoEvent } from '../../services/analytics'

interface ShowcaseWork {
  id: number
  title: string
  description: string
  price: number
  durationMinutes: number
  styleTags: string[]
  coverImage: string
  images: string[]
  likesCount: number
  favoritesCount: number
}

interface ShowcaseServiceItem {
  id: string
  name: string
  description: string
  price: number
  durationMinutes: number
}

interface ShowcasePayload {
  readOnly: boolean
  seedVersion: string
  demoEnabled: boolean
  artist: {
    id: number
    name: string
    shopName: string
    avatarUrl: string
    coverImageUrl: string
    city: string
    serviceArea: string
    bio: string
    servicePhilosophy: string
    bookingNotes: string
    styleTags: string[]
    dailyBookingLimit: number
    appointmentBufferMinutes: number
  }
  works: ShowcaseWork[]
  serviceItems: ShowcaseServiceItem[]
  appointmentStatuses: Array<{
    code: string
    label: string
    summary: string
    sampleAmount: number
  }>
}

const FALLBACK_SHOWCASE: ShowcasePayload = {
  readOnly: true,
  seedVersion: '2026-11-26.1',
  demoEnabled: true,
  artist: {
    id: 0,
    name: 'Luna',
    shopName: '栖木美甲工作室',
    avatarUrl: '/onlynail-logo.jpg',
    coverImageUrl: '/images/campaign-cases/case-artist-home.webp',
    city: '上海',
    serviceArea: '静安区 / 徐汇区（演示范围）',
    bio: '独立美甲主理人 · 擅长日系透色、极简法式与本甲建构。专注一对一安静预约制服务。',
    servicePhilosophy: '只接预约、不推销办卡，用专属甲型档案记住每一位客人的手感与喜好。',
    bookingNotes: '本主页为 OnlyNail 官方演示样板间：展示作品、报价规则与预约流程，不含任何真实客户隐私信息。',
    styleTags: ['极简法式', '日系透色', '玻璃珠猫眼', '本甲建构'],
    dailyBookingLimit: 4,
    appointmentBufferMinutes: 30,
  },
  works: [
    {
      id: 1,
      title: '月光猫眼极简法式',
      description: '高透裸粉打底配极细白法式边，指尖带细腻玻璃珠猫眼光泽，日常通勤百搭。',
      price: 238,
      durationMinutes: 90,
      styleTags: ['法式'],
      coverImage: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80',
      images: ['https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80'],
      likesCount: 21,
      favoritesCount: 11,
    },
    {
      id: 2,
      title: '日系透色晕染琥珀',
      description: '多层次茶色透胶晕染叠加金箔碎贝壳，显白柔和，适合秋冬叠搭毛衣。',
      price: 268,
      durationMinutes: 105,
      styleTags: ['日式'],
      coverImage: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=900&q=80',
      images: ['https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=900&q=80'],
      likesCount: 24,
      favoritesCount: 13,
    },
    {
      id: 3,
      title: '清冷冰透碎钻水波纹',
      description: '透明立体水波纹塑形配合细闪碎钻，阳光下折射清透水光感。',
      price: 298,
      durationMinutes: 110,
      styleTags: ['冰透'],
      coverImage: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=80',
      images: ['https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=80'],
      likesCount: 27,
      favoritesCount: 15,
    },
    {
      id: 4,
      title: '杏仁甲纯欲腮红渐变',
      description: '原生甲修型或短甲延长皆可，蜜桃腮红中心晕染，温柔减龄。',
      price: 188,
      durationMinutes: 75,
      styleTags: ['纯欲'],
      coverImage: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80',
      images: ['https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80'],
      likesCount: 30,
      favoritesCount: 17,
    },
    {
      id: 5,
      title: '极简雾面燕麦纯色',
      description: '高级低饱和燕麦色配合绒雾封层与单指微立体银线，耐看克制。',
      price: 158,
      durationMinutes: 60,
      styleTags: ['简约'],
      coverImage: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=80',
      images: ['https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=80'],
      likesCount: 33,
      favoritesCount: 19,
    },
    {
      id: 6,
      title: '美拉德焦糖猫眼跳色',
      description: '深棕焦糖与香槟金猫眼跳色组合，带微粒磁粉光圈，显手白。',
      price: 218,
      durationMinutes: 85,
      styleTags: ['猫眼'],
      coverImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
      images: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80'],
      likesCount: 36,
      favoritesCount: 21,
    },
    {
      id: 7,
      title: '新娘珍珠轻奢钻饰款',
      description: '乳白透底搭配施华洛小颗平底钻与异形淡水珍珠，拍照上镜不勾发。',
      price: 388,
      durationMinutes: 135,
      styleTags: ['新娘'],
      coverImage: 'https://images.unsplash.com/photo-1515688594390-b649af70d282?auto=format&fit=crop&w=900&q=80',
      images: ['https://images.unsplash.com/photo-1515688594390-b649af70d282?auto=format&fit=crop&w=900&q=80'],
      likesCount: 39,
      favoritesCount: 23,
    },
    {
      id: 8,
      title: '手绘复古格纹小香风',
      description: '全手绘奶白格纹与细金链点缀，精致名媛气质。',
      price: 328,
      durationMinutes: 120,
      styleTags: ['手绘'],
      coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80',
      images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80'],
      likesCount: 42,
      favoritesCount: 25,
    },
  ],
  serviceItems: [
    {
      id: 'demo_svc_base_care',
      name: '精致修形与前置护理',
      description: '日式干湿结合去死皮、指缘抛光与基础加固',
      price: 68,
      durationMinutes: 30,
    },
    {
      id: 'demo_svc_extension',
      name: '全手无痛延长 / 本甲卸除',
      description: '轻薄半贴/纸托延长或温和卸甲养护',
      price: 120,
      durationMinutes: 45,
    },
  ],
  appointmentStatuses: [
    { code: 'pending_quote', label: '待报价', summary: '顾客发送参考图后，美甲师 10 秒生成明细报价单', sampleAmount: 268 },
    { code: 'pending_confirm', label: '待确认', summary: '顾客收到透明价目与耗时预估，一键确认时段', sampleAmount: 298 },
    { code: 'confirmed', label: '已确认', summary: '系统高亮提醒顾客甲型特征与避坑禁忌', sampleAmount: 158 },
    { code: 'completed', label: '已完成', summary: '自动沉淀本次配色与胶号档案，复购可直接查看', sampleAmount: 268 },
  ],
}

interface ReadOnlyShowcaseSectionProps {
  onOpenScan?: (type: 'artist' | 'try' | 'follow', meta?: { workTitle?: string }) => void
}

export default function ReadOnlyShowcaseSection({ onOpenScan }: ReadOnlyShowcaseSectionProps) {
  const { isZh } = useLang()
  const [data, setData] = useState<ShowcasePayload>(FALLBACK_SHOWCASE)
  const [selectedWork, setSelectedWork] = useState<ShowcaseWork | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [readOnlyNotice, setReadOnlyNotice] = useState('')

  useEffect(() => {
    trackDemoEvent('demo_step_complete', {
      scenario: 'quote',
      step: 1,
      totalSteps: 1,
      completed: true,
      surface: 'standalone',
    })
    fetch('/api/demo/showcase')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && Array.isArray(json.works) && json.works.length > 0) {
          setData(json)
        }
      })
      .catch(() => {
        // Keep fallback showcase data when offline
      })
  }, [])

  const activeWork = selectedWork || data.works[0]
  const activeAddons = data.serviceItems.filter((item) =>
    selectedAddons.includes(item.id),
  )
  const totalQuotePrice =
    (activeWork?.price || 0) +
    activeAddons.reduce((sum, item) => sum + item.price, 0)
  const totalQuoteMinutes =
    (activeWork?.durationMinutes || 0) +
    activeAddons.reduce((sum, item) => sum + item.durationMinutes, 0)

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  return (
    <section className="site-section site-container border-b border-line pb-12">
      {/* 只读样板顶部横幅 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-brand-bg px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-ink">
          <Eye size={15} className="shrink-0" />
          <span>
            {isZh
              ? '只读样板间 · 免登录即可完整浏览主页、作品、报价与预约流转效果（无真实客户隐私）'
              : 'Read-only Showcase · Browse artist profile, works, quote preview & booking flow without login'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenScan && (
            <button
              type="button"
              onClick={() => onOpenScan('try')}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-[var(--nb-pressed)]"
            >
              {isZh ? '微信扫码进入 Demo 试用' : 'Try Demo in WeChat'}
            </button>
          )}
          {onOpenScan && (
            <button
              type="button"
              onClick={() => onOpenScan('try')}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-inverse transition hover:bg-action-pressed"
            >
              {isZh ? '免费注册，开通我的工作台' : 'Register Free to Create My Studio'}
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 样板美甲师主页卡片 */}
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
          <div className="flex items-start gap-4">
            <img
              src={data.artist.avatarUrl}
              alt={data.artist.shopName}
              className="h-14 w-14 shrink-0 rounded-2xl border border-line object-cover"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nb-pressed)] px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                  <Sparkles size={12} />
                  {isZh ? '官方样板间' : 'Official Showcase'}
                </span>
                <span className="text-xs text-ink-muted">
                  {data.artist.city} · {data.artist.serviceArea}
                </span>
              </div>
              <h1 className="mt-1.5 text-xl sm:text-2xl font-bold text-ink">
                {data.artist.shopName} · {data.artist.name}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">{data.artist.bio}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.artist.styleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line bg-brand-bg px-3 py-1 text-xs font-medium text-ink"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-xs text-ink-muted border-b border-line">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="shrink-0" />
            {data.artist.serviceArea}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} className="shrink-0" />
            {isZh
              ? `每日接单上限 ${data.artist.dailyBookingLimit} 单 · 间隔 ${data.artist.appointmentBufferMinutes} 分钟`
              : `${data.artist.dailyBookingLimit} bookings/day · ${data.artist.appointmentBufferMinutes}m buffer`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="shrink-0" />
            {data.artist.bookingNotes}
          </span>
        </div>

        {/* 作品集列表（8-12款，价格与时长各不相同） */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-ink">
              {isZh
                ? `样板作品集（${data.works.length} 款 · 点击查看详情与报价试算）`
                : `Portfolio (${data.works.length} Works)`}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {data.works.map((work) => (
              <button
                key={work.id}
                type="button"
                onClick={() => {
                  setSelectedWork(work)
                  setSelectedAddons([])
                  setReadOnlyNotice('')
                }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition hover:border-ink/40 active:scale-[0.99]"
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-[var(--nb-pressed)]">
                  <img
                    src={work.coverImage}
                    alt={work.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded bg-[var(--nb-pressed)] px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                      {work.styleTags[0] || '定制'}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {work.durationMinutes} min
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-ink">
                    {work.title}
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">¥{work.price}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 快捷报价只读试算 + 预约状态示意 */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-brand-bg p-5">
            <h3 className="text-sm font-bold text-ink">
              {isZh ? '快捷报价只读试算（示例）' : 'Read-only Quick Quote Preview'}
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              {isZh
                ? `当前基准款式：${activeWork?.title}（¥${activeWork?.price} / ${activeWork?.durationMinutes} 分钟）`
                : `Base work: ${activeWork?.title} (¥${activeWork?.price} / ${activeWork?.durationMinutes}m)`}
            </p>
            <div className="mt-3 space-y-2">
              {data.serviceItems.slice(0, 4).map((item) => {
                const checked = selectedAddons.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleAddon(item.id)}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                      checked
                        ? 'border-ink bg-surface font-semibold text-ink'
                        : 'border-line bg-surface text-ink-muted hover:border-ink/30'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          checked ? 'border-ink bg-ink text-inverse' : 'border-line'
                        }`}
                      >
                        {checked && <Check size={11} />}
                      </span>
                      <span>{item.name}</span>
                    </span>
                    <span className="shrink-0 font-medium text-ink">
                      +¥{item.price} · {item.durationMinutes}m
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <div>
                <div className="text-xs text-ink-muted">
                  {isZh
                    ? `预计总耗时 ${totalQuoteMinutes} 分钟`
                    : `Est. ${totalQuoteMinutes} mins`}
                </div>
                <div className="text-lg font-bold text-ink">
                  {isZh ? `预估合计 ¥${totalQuotePrice}` : `Total ¥${totalQuotePrice}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setReadOnlyNotice(
                    isZh
                      ? '当前为免登录只读样板间，不会向美甲师发出真实预约。如需动手试用，请扫码免费注册，开通自己的工作台。'
                      : 'This is a read-only showcase. Enter the shared Demo workspace or apply to create your own studio.',
                  )
                }
                className="min-h-[44px] rounded-full bg-ink px-4 py-2 text-xs font-semibold text-inverse transition hover:bg-action-pressed"
              >
                {isZh ? '生成报价单（样板演示）' : 'Preview Quote'}
              </button>
            </div>
            {readOnlyNotice && (
              <p className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
                {readOnlyNotice}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-brand-bg p-5">
            <h3 className="text-sm font-bold text-ink">
              {isZh ? '预约状态流转示意（无真实客户信息）' : 'Appointment Lifecycle Preview'}
            </h3>
            <div className="mt-3 space-y-2.5">
              {data.appointmentStatuses.map((step) => (
                <div
                  key={step.code}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5"
                >
                  <div>
                    <span className="inline-block rounded bg-[var(--nb-pressed)] px-2 py-0.5 text-[11px] font-semibold text-ink">
                      {step.label}
                    </span>
                    <p className="mt-1 text-xs text-ink-muted">{step.summary}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-ink">
                    ¥{step.sampleAmount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 作品详情只读弹窗 */}
      {selectedWork && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedWork(null)}
        >
          <div
            className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface p-5 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedWork(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink"
            >
              <X size={18} />
            </button>
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--nb-pressed)]">
              <img
                src={selectedWork.coverImage}
                alt={selectedWork.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-ink">{selectedWork.title}</h3>
              <span className="text-lg font-bold text-ink">¥{selectedWork.price}</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {selectedWork.styleTags.join(' · ')} · 预计耗时 {selectedWork.durationMinutes} 分钟
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink">
              {selectedWork.description}
            </p>
            <div className="mt-5 rounded-xl border border-line bg-brand-bg p-3 text-xs text-ink-muted">
              {isZh
                ? '只读样板说明：本页面展示真实客户视角下的作品详情与透明工时，点击预约仅演示提示，不会打扰任何真实美甲师。'
                : 'Read-only preview: no real booking or message will be submitted.'}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedWork(null)}
                className="min-h-[44px] flex-1 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink"
              >
                {isZh ? '继续浏览作品' : 'Keep Browsing'}
              </button>
              {onOpenScan && (
                <button
                  type="button"
                  onClick={() => onOpenScan('try')}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-inverse transition hover:bg-action-pressed"
                >
                  {isZh ? '免费注册，开通我的工作台' : 'Register Free to Create Studio'}
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
