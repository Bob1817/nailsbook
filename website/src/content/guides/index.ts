import { GUIDE_CATEGORIES, GUIDE_CATEGORY_MAP, type Guide, type GuideCategory } from './types'

const modules = import.meta.glob<{ default: Guide }>('./entries/*.json', { eager: true })

const allGuides: Guide[] = Object.values(modules).map((mod) => mod.default)

export const publishedGuides: Guide[] = allGuides.filter((g) => g.status === 'published')

const publishedBySlug = new Map<string, Guide>(publishedGuides.map((g) => [g.slug, g]))

export function getGuideBySlug(slug: string | undefined): Guide | undefined {
  if (!slug) return undefined
  return publishedBySlug.get(slug)
}

export function getRelatedGuides(guide: Guide): Guide[] {
  return guide.relatedSlugs
    .map((slug) => publishedBySlug.get(slug))
    .filter((g): g is Guide => Boolean(g && g.slug !== guide.slug))
}

export function getGuidesByCategory(category: GuideCategory): Guide[] {
  return publishedGuides.filter((g) => g.category === category)
}

export function getGuidesGroupedByCategory(): Array<{
  category: (typeof GUIDE_CATEGORIES)[number]
  guides: Guide[]
}> {
  return GUIDE_CATEGORIES.map((category) => ({
    category,
    guides: getGuidesByCategory(category.key),
  })).filter((group) => group.guides.length > 0)
}

export function getFeaturedP0Guides(limit = 4): Guide[] {
  return publishedGuides.filter((g) => g.priority === 'P0').slice(0, limit)
}

export { GUIDE_CATEGORIES, GUIDE_CATEGORY_MAP }
export type { Guide, GuideCategory }
