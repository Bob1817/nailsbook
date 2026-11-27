import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  QrCode,
  ArrowUpRight,
  Gem,
} from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'

export interface ShowcaseWork {
  id: number
  title: string
  coverUrl: string
  style?: string
  tags: string[]
  price: number
}

const STATIC_WORKS: ShowcaseWork[] = [
  {
    id: 24,
    title: '烟岚流银水墨大理石',
    coverUrl:
      'https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/1794735133336-504294697425-medium.webp',
    style: '新中式水墨',
    tags: ['水墨大理石', '新中式', '气质显白'],
    price: 268,
  },
  {
    id: 23,
    title: '巴洛克哥特暗黑高定',
    coverUrl:
      'https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/1794735131505-2960d3d59704-medium.webp',
    style: '哥特巴洛克',
    tags: ['重工高定', '施华洛世奇钻', '暗夜女王'],
    price: 428,
  },
  {
    id: 20,
    title: '极光流金微波延长甲',
    coverUrl:
      'https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/1794735128999-64c664d9c715-medium.webp',
    style: '轻奢老钱风',
    tags: ['尖圆延长', '流光金线', '修长显手细'],
    price: 328,
  },
  {
    id: 21,
    title: '法式琥珀金箔立体雕花',
    coverUrl: '/images/campaign-cases/case-work-detail.webp',
    style: '复古法式',
    tags: ['法式高定', '立体浮雕', '精致优雅'],
    price: 358,
  },
]

interface FlagshipShowcaseSectionProps {
  onOpenScan: (type: 'artist' | 'try' | 'follow', meta?: { workTitle?: string }) => void
}

export default function FlagshipShowcaseSection({ onOpenScan }: FlagshipShowcaseSectionProps) {
  const { isZh } = useLang()
  // 演示样板口径：只展示示例作品，不再拉取真实美甲师账号的作品数据。
  const [works] = useState<ShowcaseWork[]>(STATIC_WORKS)

  return (
    <section id="flagship" className="site-section flagship-compact-section">
      <div className="site-container">
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">02 / {isZh ? '主页效果预览' : 'ARTIST PAGE PREVIEW'}</p>
          <h2>
            {isZh
              ? '用上 OnlyNail 后，你的专属主页长这样。'
              : 'See what your own artist page can look like.'}
          </h2>
          <p className="section-intro">
            {isZh
              ? '以下为演示样板间的主页效果示例。免费注册后，你也可以拥有完全独立的专属主页与小程序码，客户仅通过你的分享进入，不与其他美甲师共享流量。'
              : 'A demo showcase of an artist page. Register free and get your own private storefront and QR code with zero client cross-routing.'}
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
            <div className="flex items-start gap-4">
              <div
                aria-label="栖木美甲工作室"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-[var(--nb-pressed)] text-base font-bold tracking-tight text-ink"
              >
                栖木
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nb-pressed)] px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                    <Sparkles size={12} className="text-brand" />
                    {isZh ? '演示样板间' : 'Demo Showcase'}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {isZh ? '仅作主页效果展示' : 'Showcase preview'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-ink mt-1">
                  {isZh ? '栖木美甲工作室 · Luna' : 'Qimu Nail Studio · Luna'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isZh
                    ? '独立主理人主页 · 风格标签 · 透明价目与预约规则'
                    : 'Independent Artist Storefront · Style Tags · Transparent Rules'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/demo"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:bg-[var(--nb-pressed)]"
                >
                  {isZh ? '查看样板间' : 'View Demo'}
                  <ArrowUpRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => onOpenScan('try')}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-5 py-2 text-xs font-bold text-inverse transition hover:bg-action-pressed active:scale-[0.98]"
                >
                  <QrCode size={15} />
                  {isZh ? '微信扫码预览效果' : 'Preview in WeChat'}
                </button>
              </div>
              <span className="text-[11px] text-ink-muted">
                {isZh ? '支持网页版直接体验或微信扫码查看真实客户视角' : 'Interactive web preview or WeChat scan'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-xs text-ink-muted border-b border-line">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-brand shrink-0" />
              {isZh ? '支持到店定位指引 / 上门服务范围' : 'Studio map or home-visit zone'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-brand shrink-0" />
              {isZh ? '自定义每日接待上限与服务间隔' : 'Custom daily capacity & gaps'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              {isZh ? '明码标价 · 客户仅绑定你本人' : 'Clear pricing · Private client binding'}
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-ink flex items-center gap-1.5">
                <Gem size={14} />
                {isZh ? '作品集展示效果（示例）' : 'Portfolio Layout Example'}
              </h4>
              <button
                type="button"
                onClick={() => onOpenScan('try')}
                className="text-xs font-semibold text-brand hover:underline inline-flex min-h-[44px] items-center gap-0.5"
              >
                {isZh ? '扫码看完整主页效果 ↗' : 'Preview full page ↗'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {works.map((work) => (
                <article
                  key={work.id}
                  onClick={() => onOpenScan('try', { workTitle: work.title })}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-xs"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--nb-pressed)]">
                    <img
                      src={work.coverUrl}
                      alt={work.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <span className="absolute top-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
                      ¥{work.price}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <h5 className="line-clamp-1 text-xs font-bold text-ink">{work.title}</h5>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-ink-muted">
                      <span>{work.style}</span>
                      <span className="text-ink-muted group-hover:text-ink">预览效果</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-brand-bg p-4 text-xs text-ink-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <strong className="text-ink">
                {isZh ? '你的专属主页同样如此：' : 'Your page works the same way:'}
              </strong>
              <span>
                {isZh
                  ? '自主上传作品、自由定价、支持一键生成朋友圈名片海报与微信快捷报价单。'
                  : 'Upload your own works, set your own prices, and share quote cards directly in WeChat.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenScan('try')}
              className="inline-flex min-h-[44px] items-center gap-1 font-bold text-ink hover:underline shrink-0"
            >
              {isZh ? '免费注册，拥有同款主页' : 'Register free, get your own page'}
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
