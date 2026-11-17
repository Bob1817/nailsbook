import { useState, useEffect } from 'react'
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
    title: '烟岚流银水墨大理石 / 冰透灰阶水韵款',
    coverUrl:
      'https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/1794735133336-504294697425-medium.webp',
    style: '新中式水墨',
    tags: ['水墨大理石', '新中式', '气质显白'],
    price: 298,
  },
  {
    id: 23,
    title: '巴洛克哥特暗黑高定 / 复古报纸手绘与重工十字',
    coverUrl:
      'https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/1794735131505-2960d3d59704-medium.webp',
    style: '哥特巴洛克',
    tags: ['重工高定', '施华洛世奇钻', '暗夜女王'],
    price: 428,
  },
  {
    id: 20,
    title: '极光流金微波流线 / 轻奢尖圆延长甲',
    coverUrl:
      'https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/1794735128999-64c664d9c715-medium.webp',
    style: '轻奢老钱风',
    tags: ['尖圆延长', '流光金线', '修长显手细'],
    price: 298,
  },
  {
    id: 21,
    title: '复古法式浮雕手绘 / 宫廷金边与立体雕花',
    coverUrl:
      'https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/1794735129977-94d8cb8e6302-medium.webp',
    style: '复古法式',
    tags: ['法式高定', '立体浮雕', '精致优雅'],
    price: 298,
  },
]

interface FlagshipShowcaseSectionProps {
  onOpenScan: (type: 'artist' | 'try' | 'follow', meta?: { workTitle?: string }) => void
}

export default function FlagshipShowcaseSection({ onOpenScan }: FlagshipShowcaseSectionProps) {
  const { isZh } = useLang()
  const [works, setWorks] = useState<ShowcaseWork[]>(STATIC_WORKS)

  useEffect(() => {
    fetch('/api/public/brands/55/works')
      .then((res) => {
        if (!res.ok) throw new Error('fetch works failed')
        return res.json()
      })
      .then((data) => {
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const mapped: ShowcaseWork[] = data.items.slice(0, 4).map((item: any) => {
            let tags: string[] = []
            if (Array.isArray(item.tags)) {
              tags = item.tags
                .map((t: string) => t.replace(/[[\]"]/g, '').trim())
                .filter(Boolean)
            }
            return {
              id: item.id,
              title: item.title,
              coverUrl: item.coverUrl,
              style: item.style || (tags.length > 0 ? tags[0] : '原创设计'),
              tags: tags.slice(0, 3),
              price: item.price || (item.referencePrice?.exact ?? 298),
            }
          })
          if (mapped.length > 0) setWorks(mapped)
        }
      })
      .catch(() => {
        // preserve STATIC_WORKS
      })
  }, [])

  return (
    <section id="flagship" className="site-section flagship-compact-section">
      <div className="site-container">
        {/* Studio Card Header */}
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
            <div className="flex items-start gap-4">
              <img
                src="https://nails-products-lunails.oss-cn-hangzhou.aliyuncs.com/images/1794496771737-389508962067-medium.webp"
                alt="贝贝"
                className="h-14 w-14 rounded-2xl object-cover shrink-0 border border-line"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-ink">
                    <Sparkles size={12} className="text-brand" />
                    {isZh ? '标杆样板店' : 'Flagship Studio'}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {isZh ? 'OnlyNail 官方认证' : 'Verified'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-ink mt-1">
                  {isZh ? '听栖美甲工作室 · 贝贝' : 'Tingqi Nail Studio · Beibei'}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isZh
                    ? '中国美院本硕毕业 · 专业美学设计 · 预约定制制'
                    : 'China Academy of Art Graduate · Bespoke Studio'}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenScan('artist')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-5 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                <QrCode size={15} />
                {isZh ? '微信扫码进店预约' : 'Scan to Book'}
              </button>
              <span className="text-[11px] text-ink-muted">
                {isZh ? '美甲师可参考此样本' : 'Demo for artists'}
              </span>
            </div>
          </div>

          {/* Quick Info Tags */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-xs text-ink-muted border-b border-line">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-brand shrink-0" />
              {isZh ? '杭州西湖区紫萱路西城博司4幢421' : 'Hangzhou Xihu'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-brand shrink-0" />
              {isZh ? '10:00 - 21:00 (每日限4人)' : '10:00 - 21:00'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              {isZh ? '一口价含建构 · 7天免费修补' : 'Fixed Price · 7-Day Care'}
            </span>
          </div>

          {/* Compact 4-Works Grid */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-ink flex items-center gap-1.5">
                <Gem size={14} />
                {isZh ? '精选在架作品（部分）' : 'Featured Works'}
              </h4>
              <button
                type="button"
                onClick={() => onOpenScan('artist')}
                className="text-xs font-semibold text-brand hover:underline inline-flex min-h-[44px] items-center gap-0.5"
              >
                {isZh ? '查看全部 12 款作品 ↗' : 'View all 12 works ↗'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {works.map((work) => (
                <article
                  key={work.id}
                  onClick={() => onOpenScan('artist', { workTitle: work.title })}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-xs"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
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
                      <span className="text-brand group-hover:underline">扫码预约</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Transparent Price Summary Row */}
          <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-xs text-ink-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <strong className="text-ink">价目明细：</strong>
              <span>
                实色 ¥168 | 简单款 ¥238起 | 复杂款 ¥298起 | 甲片延长 ¥120 | 本店消费免卸甲费
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenScan('artist')}
              className="inline-flex min-h-[44px] items-center gap-1 font-bold text-ink hover:underline shrink-0"
            >
              {isZh ? '查看完整价目单' : 'Full price list'}
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
