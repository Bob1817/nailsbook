import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen } from 'lucide-react'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import { Meta } from '../components/Meta'
import {
  GUIDE_CATEGORIES,
  GUIDE_CATEGORY_MAP,
  getGuidesByCategory,
  type GuideCategory,
} from '../content/guides'
import { GuideNotFound } from './GuideDetailPage'

export default function GuideCategoryPage() {
  const { key } = useParams<{ key: string }>()
  const categoryKey = key as GuideCategory | undefined
  const categoryMeta = categoryKey ? GUIDE_CATEGORY_MAP[categoryKey] : undefined

  if (!categoryMeta) {
    return <GuideNotFound />
  }

  const guides = getGuidesByCategory(categoryMeta.key)
  const canonicalPath = `/guides/category/${categoryMeta.key}`
  const pageUrl = `https://lunails.cn${canonicalPath}`

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: 'https://lunails.cn/' },
      { '@type': 'ListItem', position: 2, name: '指南', item: 'https://lunails.cn/guides' },
      { '@type': 'ListItem', position: 3, name: categoryMeta.label, item: pageUrl },
    ],
  }

  return (
    <div className="recruitment-site">
      <Meta
        rawTitle={`${categoryMeta.label}指南 — OnlyNail 独立美甲师经营指南`}
        description={`${categoryMeta.description} 共 ${guides.length} 篇实战方法指南，一问一页。`}
        canonicalPath={canonicalPath}
      >
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Meta>

      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <NavBar />

      <main id="main" className="site-container py-10 sm:py-14">
        <header className="max-w-[44em] pb-8 border-b border-line">
          <nav
            aria-label="面包屑导航"
            className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted"
          >
            <Link to="/" className="hover:text-ink transition-colors">
              首页
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/guides" className="hover:text-ink transition-colors">
              指南
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink font-medium">{categoryMeta.label}</span>
          </nav>

          <p className="eyebrow flex items-center gap-1.5">
            <BookOpen size={14} aria-hidden="true" />
            CATEGORY · 共 {guides.length} 篇
          </p>
          <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-ink leading-tight">
            {categoryMeta.label}指南
          </h1>
          <p className="mt-3 text-base leading-[1.7] text-ink-muted">
            {categoryMeta.description}
          </p>

          {/* 分类切换导航（手机端同样可达） */}
          <nav aria-label="切换指南分类" className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/guides"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink-muted transition hover:text-ink"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span>全部分类</span>
            </Link>
            {GUIDE_CATEGORIES.map((cat) => {
              const active = cat.key === categoryMeta.key
              return (
                <Link
                  key={cat.key}
                  to={`/guides/category/${cat.key}`}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? 'border-ink bg-ink text-inverse'
                      : 'border-line bg-surface text-ink hover:border-ink/40 hover:bg-[var(--nb-pressed)]'
                  }`}
                >
                  {cat.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <section aria-label={`${categoryMeta.label}文章列表`} className="mt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                to={`/guides/${guide.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition hover:border-ink/40 hover:shadow-xs min-h-[44px]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center rounded-full bg-[var(--nb-pressed)] px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                      {categoryMeta.label}
                    </span>
                    <time dateTime={guide.updatedAt} className="text-[11px] text-ink-muted">
                      {guide.updatedAt}
                    </time>
                  </div>
                  <h2 className="text-base sm:text-[17px] font-bold text-ink leading-snug group-hover:underline">
                    {guide.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {guide.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-semibold text-ink">
                  <span>阅读完整步骤</span>
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          aria-label="延伸入口"
          className="mt-12 rounded-3xl border border-line bg-surface p-6 sm:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-[38em] space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-ink">
                免登录体验样板美甲师工作台
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                在样板间直接查看真实线上主页、客户档案与快捷报价单；了解工具收费与数据归属请查看{' '}
                <Link to="/faq" className="font-semibold text-ink underline hover:opacity-80">
                  产品常见问题（/faq）
                </Link>
                。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                to="/demo"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-inverse transition hover:bg-action-pressed"
              >
                <span>查看样板间</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              <Link
                to="/apply"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-line bg-brand-bg px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-[var(--nb-pressed)]"
              >
                <span>免费开通工作台</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
