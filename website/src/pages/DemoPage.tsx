import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import InteractiveDemoSection from '../components/demo/InteractiveDemoSection'
import ReadOnlyShowcaseSection from '../components/demo/ReadOnlyShowcaseSection'
import { useLang } from '../i18n/LanguageContext'
import { getFeaturedP0Guides } from '../content/guides'

export default function DemoPage() {
  const { isZh } = useLang()
  const [scan, setScan] = useState<'try' | 'follow' | 'artist' | null>(null)
  const [scanMeta, setScanMeta] = useState<{ workTitle?: string } | null>(null)

  return (
    <div className="recruitment-site">
      <Meta
        title={isZh ? '交互式双端演示 · OnlyNail 你的专属美甲师' : 'Interactive Demo · OnlyNail'}
        description={
          isZh
            ? '30 秒在线亲手体验 OnlyNail 顾客端小程序与美甲师工作台的双端实时联动：10 秒快捷报价、老客预约避坑穿透与专属主页引流。'
            : 'Experience OnlyNail live dual-sided sync in 30 seconds: quick quote, client nail alerts, and private artist storefront.'
        }
      />
      <a className="skip-link" href="#main">
        {isZh ? '跳到主要内容' : 'Skip to content'}
      </a>
      <NavBar />
      <main id="main">
        <ReadOnlyShowcaseSection
          onOpenScan={(type, meta) => {
            setScanMeta(meta || null)
            setScan(type)
          }}
        />
        <InteractiveDemoSection
          standalone
          onOpenScan={(type, meta) => {
            setScanMeta(meta || null)
            setScan(type)
          }}
        />
        <section
          aria-label="相关经营指南"
          className="site-container pb-12"
        >
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-bold text-ink">
                {isZh ? '延伸阅读：独立美甲师经营指南' : 'Related Guides'}
              </h2>
              <Link
                to="/guides"
                className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
              >
                <span>{isZh ? '全部指南' : 'All Guides'}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getFeaturedP0Guides(4).map((guide) => (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="group flex items-center justify-between gap-2 rounded-2xl border border-line bg-brand-bg px-4 py-3 min-h-[44px] text-sm font-semibold text-ink hover:border-ink/40"
                >
                  <span className="group-hover:underline">{guide.title}</span>
                  <ArrowRight size={14} aria-hidden="true" className="shrink-0 text-ink-muted" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      {scan && (
        <ScanQrModal
          type={scan}
          artistId={55}
          artistName="贝贝"
          shopName="听栖美甲工作室"
          workTitle={scanMeta?.workTitle}
          onClose={() => {
            setScan(null)
            setScanMeta(null)
          }}
        />
      )}
    </div>
  )
}
