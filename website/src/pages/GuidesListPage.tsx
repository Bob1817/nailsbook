import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpen } from 'lucide-react'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import { Meta } from '../components/Meta'
import { getGuidesGroupedByCategory, publishedGuides } from '../content/guides'

export default function GuidesListPage() {
  const groups = getGuidesGroupedByCategory()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '首页',
        item: 'https://lunails.cn/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '独立美甲师经营指南',
        item: 'https://lunails.cn/guides',
      },
    ],
  }

  return (
    <div className="recruitment-site">
      <Meta
        rawTitle="独立美甲师经营与接单指南 — OnlyNail 指南"
        description="面向独立美甲师与自由美甲师的实战方法指南：涵盖无店接单、客户档案管理、预约防撞单、专业报价定价、作品集展示与单干日常工作流。"
        canonicalPath="/guides"
      >
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Meta>

      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <NavBar />

      <main id="main" className="site-container py-10 sm:py-14">
        {/* 页头定位 */}
        <header className="max-w-[44em] pb-8 border-b border-line">
          <nav aria-label="面包屑导航" className="mb-4 flex items-center gap-2 text-xs text-ink-muted">
            <Link to="/" className="hover:text-ink transition-colors">
              首页
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink font-medium">经营指南</span>
          </nav>

          <p className="eyebrow flex items-center gap-1.5">
            <BookOpen size={14} aria-hidden="true" />
            GUIDES · 共 {publishedGuides.length} 篇实战方法
          </p>
          <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-ink leading-tight">
            独立与自由美甲师的接单与经营指南
          </h1>
          <p className="mt-3 text-base leading-[1.7] text-ink-muted">
            面向独立美甲师、自由美甲师的日常经营方法库：一问一页，直接解决接单获客、客户管理、预约排期、报价定价与作品展示问题。
          </p>

          {/* 分类锚点导航 */}
          <nav
            aria-label="指南分类"
            className="mt-6 flex flex-wrap gap-2"
          >
            {groups.map(({ category, guides }) => (
              <a
                key={category.key}
                href={`#${category.key}`}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink/40 hover:bg-[var(--nb-pressed)]"
              >
                <span>{category.label}</span>
                <span className="rounded-full bg-[var(--nb-pressed)] px-1.5 py-0.5 text-[11px] text-ink-muted">
                  {guides.length}
                </span>
              </a>
            ))}
          </nav>
        </header>

        {/* 按 5 个分类分组展示 */}
        <div className="mt-10 space-y-12">
          {groups.map(({ category, guides }) => (
            <section
              key={category.key}
              id={category.key}
              aria-labelledby={`cat-${category.key}`}
              className="scroll-mt-24"
            >
              <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2
                    id={`cat-${category.key}`}
                    className="text-xl sm:text-2xl font-bold text-ink"
                  >
                    {category.label}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">{category.description}</p>
                </div>
                <Link
                  to={`/guides/category/${category.key}`}
                  className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink shrink-0"
                >
                  <span>查看{category.label}专栏</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>

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
                          {category.label}
                        </span>
                        <time
                          dateTime={guide.updatedAt}
                          className="text-[11px] text-ink-muted"
                        >
                          {guide.updatedAt}
                        </time>
                      </div>
                      <h3 className="text-base sm:text-[17px] font-bold text-ink leading-snug group-hover:underline">
                        {guide.title}
                      </h3>
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
          ))}
        </div>

        {/* 页尾样板间与 /faq 区分入口 */}
        <section
          aria-label="延伸入口"
          className="mt-14 rounded-3xl border border-line bg-surface p-6 sm:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-[38em] space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-ink">
                想直接看这套方法在真实工作台里怎么跑起来？
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                你可以免登录体验样板美甲师的线上主页与快捷报价；如果想了解 OnlyNail 工具本身的收费方式、数据归属与开通说明，请查看{' '}
                <Link to="/faq" className="font-semibold text-ink underline hover:opacity-80">
                  产品常见问题（/faq）
                </Link>
                （本指南区专注解决接单与经营方法问题，产品本身问题都在 /faq）。
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
                to="/faq"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-line bg-brand-bg px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-[var(--nb-pressed)]"
              >
                <span>查看产品 FAQ</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
