import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const entriesDir = path.join(rootDir, 'src', 'content', 'guides', 'entries')
const publicDir = path.join(rootDir, 'public')

const VALID_CATEGORIES = new Set(['orders', 'clients', 'pricing', 'works', 'independent'])
const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2-1', 'P2-2'])
const PHASE1_PRIORITIES = new Set(['P0', 'P1'])
const PHASE2_PRIORITIES = new Set(['P2-1', 'P2-2'])
const VALID_STATUSES = new Set(['draft', 'published'])
const FORBIDDEN_PATTERNS = [
  /全网第一/,
  /百分百/,
  /100%成交/,
  /微信扫码领/,
  /去小红书搜/,
  /去抖音搜/,
]

function charLength(str) {
  return str.replace(/\s+/g, '').length
}

export function loadAndValidateGuides() {
  if (!fs.existsSync(entriesDir)) {
    throw new Error(`Guides entries directory missing: ${entriesDir}`)
  }

  const files = fs.readdirSync(entriesDir).filter((f) => f.endsWith('.json')).sort()
  if (files.length === 0) {
    throw new Error('No guide JSON files found in src/content/guides/entries')
  }

  const guides = []
  const errors = []
  const warnings = []

  for (const file of files) {
    const filePath = path.join(entriesDir, file)
    const expectedSlug = file.replace(/\.json$/, '')
    let guide
    try {
      guide = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch (err) {
      errors.push(`${file}: invalid JSON (${err.message})`)
      continue
    }

    if (guide.slug !== expectedSlug) {
      errors.push(`${file}: slug "${guide.slug}" must match filename "${expectedSlug}"`)
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.slug || '')) {
      errors.push(`${file}: slug "${guide.slug}" must be lowercase kebab-case`)
    }
    if (!VALID_CATEGORIES.has(guide.category)) {
      errors.push(`${file}: invalid category "${guide.category}"`)
    }
    if (!VALID_PRIORITIES.has(guide.priority)) {
      errors.push(`${file}: invalid priority "${guide.priority}"`)
    }
    if (!VALID_STATUSES.has(guide.status)) {
      errors.push(`${file}: invalid status "${guide.status}"`)
    }

    guides.push({ file, guide })
  }

  const published = guides.filter(({ guide }) => guide.status === 'published')
  const publishedMap = new Map(published.map(({ guide }) => [guide.slug, guide]))
  const seenTitles = new Set()

  for (const { file, guide } of published) {
    for (const field of [
      'slug',
      'title',
      'summary',
      'directAnswer',
      'body',
      'onlynailNote',
      'onlynailLink',
      'onlynailLinkLabel',
      'coverImage',
      'coverAlt',
      'updatedAt',
    ]) {
      if (!guide[field] || typeof guide[field] !== 'string' || !guide[field].trim()) {
        errors.push(`${file}: missing required string field "${field}"`)
      }
    }

    if (seenTitles.has(guide.title)) {
      errors.push(`${file}: duplicate title "${guide.title}"`)
    }
    seenTitles.add(guide.title)

    const summaryLen = charLength(guide.summary || '')
    if (summaryLen === 0 || summaryLen > 40) {
      errors.push(`${file}: summary length ${summaryLen} must be 1-40 non-space chars`)
    }

    const answerLen = charLength(guide.directAnswer || '')
    if (answerLen < 50 || answerLen > 100) {
      errors.push(`${file}: directAnswer length ${answerLen} must be 50-100 chars`)
    }

    const bodyLen = charLength(guide.body || '')
    if (bodyLen < 600 || bodyLen > 900) {
      errors.push(`${file}: body length ${bodyLen} must be 600-900 chars`)
    }

    if (/onlynail/i.test(guide.body || '')) {
      errors.push(`${file}: "OnlyNail" must appear only in onlynailNote, not in body`)
    }

    if (!/onlynail/i.test(guide.onlynailNote || '')) {
      errors.push(`${file}: onlynailNote must mention OnlyNail`)
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(guide.body || '') || pattern.test(guide.directAnswer || '')) {
        errors.push(`${file}: forbidden marketing/redirect phrase matched ${pattern}`)
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(guide.updatedAt || '')) {
      errors.push(`${file}: updatedAt "${guide.updatedAt}" must be YYYY-MM-DD`)
    }

    const expectedCover = `/guides/images/${guide.slug}-cover.jpg`
    if (guide.coverImage !== expectedCover) {
      errors.push(`${file}: coverImage "${guide.coverImage}" must be "${expectedCover}"`)
    } else {
      const imgPath = path.join(publicDir, guide.coverImage.replace(/^\//, ''))
      if (!fs.existsSync(imgPath)) {
        errors.push(`${file}: coverImage not found at ${imgPath}`)
      }
    }

    if (!Array.isArray(guide.faq) || guide.faq.length < 2 || guide.faq.length > 3) {
      errors.push(`${file}: faq must have 2-3 items`)
    }

    if (!Array.isArray(guide.relatedSlugs) || guide.relatedSlugs.length !== 3) {
      errors.push(`${file}: relatedSlugs must have exactly 3 slugs`)
    } else {
      let hasCrossPhase = false
      const isPhase1 = PHASE1_PRIORITIES.has(guide.priority)
      const isPhase2 = PHASE2_PRIORITIES.has(guide.priority)

      for (const rel of guide.relatedSlugs) {
        if (rel === guide.slug) {
          errors.push(`${file}: relatedSlugs cannot reference itself`)
        } else if (!publishedMap.has(rel)) {
          errors.push(`${file}: relatedSlug "${rel}" is not published or does not exist`)
        } else {
          const target = publishedMap.get(rel)
          if (
            (isPhase1 && PHASE2_PRIORITIES.has(target.priority)) ||
            (isPhase2 && PHASE1_PRIORITIES.has(target.priority))
          ) {
            hasCrossPhase = true
          }
        }
      }

      if ((isPhase1 || isPhase2) && published.length > 20 && !hasCrossPhase) {
        warnings.push(`${file}: relatedSlugs has no cross-phase link`)
      }
    }

    if (guide.onlynailLink && !guide.onlynailLink.startsWith('/')) {
      errors.push(`${file}: onlynailLink "${guide.onlynailLink}" must be an internal path`)
    }
  }

  if (warnings.length > 0) {
    console.warn(`Guide warnings (${warnings.length}):\n- ${warnings.join('\n- ')}`)
  }

  if (errors.length > 0) {
    throw new Error(`Guide validation failed:\n- ${errors.join('\n- ')}`)
  }

  return published.map(({ guide }) => guide)
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__dirname, 'validate-guides.mjs')
) {
  const published = loadAndValidateGuides()
  console.log(`Validated ${published.length} published guides successfully.`)
}
