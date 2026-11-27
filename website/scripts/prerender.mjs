import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadAndValidateGuides } from './validate-guides.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const publicDir = path.join(rootDir, 'public')
const ssrDir = path.join(rootDir, 'dist-server')

const CATEGORY_KEYS = ['orders', 'clients', 'pricing', 'works', 'independent']

const BASE_ROUTES = [
  '/',
  '/demo',
  '/apply',
  '/model-artists',
  '/gallery',
  '/faq',
  '/guides',
  ...CATEGORY_KEYS.map((k) => `/guides/category/${k}`),
  '/about',
  '/contact',
  '/application-info',
  '/quote',
  '/404',
]

function buildSitemapXml(publishedGuides) {
  const staticUrls = [
    { loc: 'https://lunails.cn/', changefreq: 'weekly', priority: '1.0' },
    { loc: 'https://lunails.cn/demo', changefreq: 'weekly', priority: '0.9' },
    { loc: 'https://lunails.cn/apply', changefreq: 'weekly', priority: '0.9' },
    { loc: 'https://lunails.cn/guides', changefreq: 'weekly', priority: '0.9' },
    { loc: 'https://lunails.cn/quote', changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://lunails.cn/gallery', changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://lunails.cn/faq', changefreq: 'monthly', priority: '0.7' },
    { loc: 'https://lunails.cn/about', changefreq: 'monthly', priority: '0.6' },
    { loc: 'https://lunails.cn/contact', changefreq: 'monthly', priority: '0.6' },
    { loc: 'https://lunails.cn/application-info', changefreq: 'monthly', priority: '0.6' },
  ]

  const latestGuideDate = publishedGuides
    .map((g) => g.updatedAt)
    .sort()
    .at(-1)

  const categoryUrls = CATEGORY_KEYS.map((key) => ({
    loc: `https://lunails.cn/guides/category/${key}`,
    ...(latestGuideDate ? { lastmod: latestGuideDate } : {}),
    changefreq: 'weekly',
    priority: '0.8',
  }))

  const guideUrls = publishedGuides.map((g) => ({
    loc: `https://lunails.cn/guides/${g.slug}`,
    lastmod: g.updatedAt,
    changefreq: 'monthly',
    priority: '0.8',
  }))

  const allUrls = staticUrls
    .map((u) =>
      u.loc === 'https://lunails.cn/guides' && latestGuideDate
        ? { ...u, lastmod: latestGuideDate }
        : u,
    )
    .concat(categoryUrls, guideUrls)

  const items = allUrls
    .map((u) => {
      const lines = [
        '  <url>',
        `    <loc>${u.loc}</loc>`,
        ...(u.lastmod ? [`    <lastmod>${u.lastmod}</lastmod>`] : []),
        `    <changefreq>${u.changefreq}</changefreq>`,
        `    <priority>${u.priority}</priority>`,
        '  </url>',
      ]
      return lines.join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`
}

async function main() {
  const publishedGuides = loadAndValidateGuides()
  console.log(`Validated ${publishedGuides.length} published guides.`)

  const routes = [...BASE_ROUTES, ...publishedGuides.map((g) => `/guides/${g.slug}`)]
  const templatePath = path.join(distDir, 'index.html')
  const template = fs.readFileSync(templatePath, 'utf-8')
  const entryUrl = pathToFileURL(path.join(ssrDir, 'entry-server.js')).href
  const { render } = await import(entryUrl)

  for (const route of routes) {
    let { html, head } = render(route)

    // React 19 + react-helmet-async v3 renders <title>, <meta>, <link>, <script type="application/ld+json"> inline in html
    if (!head) {
      const hoistedTags = []
      html = html.replace(
        /<title>[\s\S]*?<\/title>|<meta\b[^>]*\/?>|<link\b[^>]*\/?>|<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,
        (tag) => {
          hoistedTags.push(tag)
          return ''
        },
      )
      head = hoistedTags.join('\n    ')
    }

    let pageHtml = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`)

    if (head) {
      if (head.includes('<title')) {
        pageHtml = pageHtml.replace(/<title>[\s\S]*?<\/title>/, '')
      }
      if (head.includes('rel="canonical"')) {
        pageHtml = pageHtml.replace(/<link\s+rel="canonical"[^>]*>/g, '')
      }
      for (const attr of [
        'name="description"',
        'name="keywords"',
        'property="og:title"',
        'property="og:description"',
        'property="og:type"',
        'property="og:url"',
        'name="twitter:title"',
        'name="twitter:description"',
      ]) {
        if (head.includes(attr)) {
          pageHtml = pageHtml.replace(new RegExp(`<meta\\s+${attr}[^>]*>`, 'g'), '')
        }
      }
      pageHtml = pageHtml.replace('</head>', `    ${head}\n  </head>`)
    }

    const outPath =
      route === '/'
        ? templatePath
        : route === '/404'
          ? path.join(distDir, '404.html')
          : path.join(distDir, route.slice(1), 'index.html')
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, pageHtml, 'utf-8')
    console.log(`Prerendered: ${route} -> ${path.relative(rootDir, outPath)}`)
  }

  const sitemapXml = buildSitemapXml(publishedGuides)
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8')
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8')
  console.log(`Generated sitemap.xml (${publishedGuides.length + 10} URLs)`)

  fs.rmSync(ssrDir, { recursive: true, force: true })
}

main().catch((err) => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
