import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Calendar, Sparkles } from 'lucide-react'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ScanQrModal from '../components/ScanQrModal'
import { Meta } from '../components/Meta'
import GuideMarkdown, { extractHowToSteps } from '../components/guides/GuideMarkdown'
import {
  GUIDE_CATEGORY_MAP,
  getGuideBySlug,
  getRelatedGuides,
} from '../content/guides'

export function GuideNotFound() {
  return (
    <div className="recruitment-site">
      <Meta
        rawTitle="未找到该篇指南 — OnlyNail 指南"
        description="你访问的指南页面不存在或已调整，请返回 OnlyNail 独立美甲师经营指南列表查看全部内容。"
      />
      <NavBar />
      <main id="main" className="site-container py-16 sm:py-24">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center">
          <p className="eyebrow">404 · NOT FOUND</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">未找到这篇指南</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            链接可能已更新，或该问题尚未发布。你可以返回指南目录浏览全部接单与经营方法。
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/guides"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-inverse transition hover:bg-action-pressed"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              <span>返回指南列表</span>
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-line bg-brand-bg px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-[var(--nb-pressed)]"
            >
              回到首页
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [scan, setScan] = useState(false)
  const guide = getGuideBySlug(slug)

  if (!guide) {
    return <GuideNotFound />
  }

  const categoryMeta = GUIDE_CATEGORY_MAP[guide.category]
  const related = getRelatedGuides(guide)
  const canonicalPath = `/guides/${guide.slug}`
  const pageUrl = `https://lunails.cn${canonicalPath}`

  const descriptionText = `${guide.summary} ${guide.directAnswer}`
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: descriptionText,
    image: `https://lunails.cn${guide.coverImage}`,
    dateModified: guide.updatedAt,
    datePublished: guide.updatedAt,
    mainEntityOfPage: pageUrl,
    author: { '@type': 'Organization', name: 'OnlyNail', url: 'https://lunails.cn' },
    publisher: { '@type': 'Organization', name: 'OnlyNail', url: 'https://lunails.cn' },
  }

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
        name: '指南',
        item: 'https://lunails.cn/guides',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryMeta.label,
        item: `https://lunails.cn/guides/category/${guide.category}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: guide.title,
        item: pageUrl,
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  const howToSteps = extractHowToSteps(guide.body)
  const howToJsonLd =
    howToSteps.length >= 2
      ? {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: guide.title,
          description: guide.directAnswer,
          step: howToSteps.map((s, idx) => ({
            '@type': 'HowToStep',
            position: idx + 1,
            name: s.name,
            text: s.text,
          })),
        }
      : null

  return (
    <div className="recruitment-site">
      <Meta
        rawTitle={`${guide.title} — OnlyNail 指南`}
        description={descriptionText}
        keywords={`${categoryMeta.label},独立美甲师,自由美甲师,美甲工作台,OnlyNail`}
        canonicalPath={canonicalPath}
        image={guide.coverImage}
        type="article"
      >
        <script type="application/ld+json">{JSON.stringify(articleJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        {howToJsonLd && (
          <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
        )}
      </Meta>

      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <NavBar />

      <main id="main" className="site-container py-8 sm:py-12">
        <article className="mx-auto max-w-[44em]">
          {/* 面包屑导航 */}
          <nav
            aria-label="面包屑导航"
            className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted"
          >
            <Link to="/" className="hover:text-ink transition-colors">
              首页
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/guides" className="hover:text-ink transition-colors">
              指南
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              to={`/guides/category/${guide.category}`}
              className="hover:text-ink transition-colors"
            >
              {categoryMeta.label}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink font-medium truncate max-w-[18em]">{guide.title}</span>
          </nav>

          {/* 1. 标题区（首屏不放大图，直接呈现 H1 与直接答案） */}
          <header className="pb-6 border-b border-line">
            <h1 className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-ink leading-[1.3]">
              {guide.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <Link
                to={`/guides/category/${guide.category}`}
                className="inline-flex min-h-[32px] items-center rounded-full bg-[var(--nb-pressed)] px-3 py-1 font-semibold text-ink hover:opacity-80"
              >
                {categoryMeta.label}
              </Link>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={13} aria-hidden="true" />
                <span>更新日期：</span>
                <time dateTime={guide.updatedAt}>{guide.updatedAt}</time>
              </span>
            </div>
          </header>

          {/* 2. 直接答案（50–120 字，独立成段，可被单独引用） */}
          <section
            aria-label="直接答案"
            className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
              直接结论
            </p>
            <p className="text-base sm:text-[17px] leading-[1.75] font-medium text-ink">
              {guide.directAnswer}
            </p>
          </section>

          {/* 配图放在直接答案之后（预留宽高避免 CLS，首图立即加载） */}
          <figure className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
            <img
              src={guide.coverImage}
              alt={guide.coverAlt}
              width={1200}
              height={750}
              loading="eager"
              className="w-full h-auto max-h-[380px] object-cover object-top"
            />
            <figcaption className="px-4 py-2.5 text-xs text-ink-muted border-t border-line">
              {guide.coverAlt}
            </figcaption>
          </figure>

          {/* 3 & 4. 正文做法 + 具体例子 */}
          <section aria-label="具体做法与示例" className="mt-8">
            <GuideMarkdown content={guide.body} />
          </section>

          {/* 5. OnlyNail 对应做法（全篇只在此处出现一次） */}
          <section
            aria-labelledby="onlynail-approach"
            className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-6"
          >
            <h2
              id="onlynail-approach"
              className="flex items-center gap-2 text-lg font-bold text-ink"
            >
              <Sparkles size={17} aria-hidden="true" />
              <span>在 OnlyNail 里怎么处理</span>
            </h2>
            <p className="mt-3 text-base leading-[1.75] text-ink-muted">
              {guide.onlynailNote}
            </p>
            <div className="mt-4">
              <Link
                to={guide.onlynailLink}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-brand-bg px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[var(--nb-pressed)]"
              >
                <span>{guide.onlynailLinkLabel}</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </section>

          {/* 6. 常见问题（3 条以内，与 FAQPage JSON-LD 逐字一致） */}
          <section aria-labelledby="guide-faq-heading" className="mt-10">
            <h2 id="guide-faq-heading" className="text-xl font-bold text-ink mb-4">
              常见问题
            </h2>
            <div className="space-y-3">
              {guide.faq.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-line bg-surface p-5"
                >
                  <h3 className="text-base font-bold text-ink leading-snug">
                    问：{item.question}
                  </h3>
                  <p className="mt-2 text-base leading-[1.7] text-ink-muted">
                    答：{item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. 相关指南 + 转化入口 */}
          <section
            aria-labelledby="related-guides-heading"
            className="mt-12 pt-8 border-t border-line"
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 id="related-guides-heading" className="text-xl font-bold text-ink">
                相关指南
              </h2>
              <Link
                to="/guides"
                className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                <span>查看全部指南</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  to={`/guides/${item.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 min-h-[44px] transition hover:border-ink/40"
                >
                  <div className="min-w-0">
                    <div className="text-base font-bold text-ink group-hover:underline">
                      {item.title}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted line-clamp-1">
                      {item.summary}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-ink-muted group-hover:text-ink"
                  />
                </Link>
              ))}
            </div>

            {/* 转化入口：指向 /demo 样板间（同步提供 /apply 免费开通） */}
            <div className="mt-8 rounded-3xl border border-line bg-surface p-6 sm:p-7">
              <h2 className="text-lg sm:text-xl font-bold text-ink">
                看看这套方法在样板美甲师主页里怎么用
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                无需登录，直接在网页版样板间体验美甲师专属主页、作品集展示、快捷报价与预约档期流程；基础版永久免费，觉得顺手再开通自己的工作台。
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/demo"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-inverse transition hover:bg-action-pressed"
                >
                  <span>进入样板间体验</span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => setScan(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-line bg-brand-bg px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-[var(--nb-pressed)]"
                >
                  <span>免费注册，开通我的工作台</span>
                </button>
              </div>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
      {scan && <ScanQrModal type="try" onClose={() => setScan(false)} />}
    </div>
  )
}
