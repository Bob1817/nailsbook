export type GuideCategory = 'orders' | 'clients' | 'pricing' | 'works' | 'independent'

export type GuidePriority = 'P0' | 'P1' | 'P2-1' | 'P2-2'

export type GuideStatus = 'draft' | 'published'

export interface GuideFaqItem {
  question: string
  answer: string
}

export interface Guide {
  slug: string
  title: string
  category: GuideCategory
  priority: GuidePriority
  summary: string
  directAnswer: string
  body: string
  onlynailNote: string
  onlynailLink: string
  onlynailLinkLabel: string
  faq: GuideFaqItem[]
  relatedSlugs: string[]
  coverImage: string
  coverAlt: string
  updatedAt: string
  status: GuideStatus
}

export interface GuideCategoryMeta {
  key: GuideCategory
  label: string
  description: string
}

export const GUIDE_CATEGORIES: GuideCategoryMeta[] = [
  {
    key: 'orders',
    label: '获客接单',
    description: '没有实体店、刚开始单干或做上门服务时，如何把第一批客户和稳定订单跑起来。',
  },
  {
    key: 'clients',
    label: '客户预约',
    description: '客户变多后如何记偏好、排档期、防撞单、处理改约与老客复购跟进。',
  },
  {
    key: 'pricing',
    label: '报价定价',
    description: '基础款与复杂款式怎么定出合理价格，如何用清晰报价单减少微信扯皮。',
  },
  {
    key: 'works',
    label: '作品包装',
    description: '作品图怎么整理、排版、建线上主页与导出分发，让客户一眼看懂你的风格。',
  },
  {
    key: 'independent',
    label: '单干经营',
    description: '从在店上班转向独立接单前的准备、收益算账与日常时间安排方法。',
  },
]

export const GUIDE_CATEGORY_MAP: Record<GuideCategory, GuideCategoryMeta> = {
  orders: GUIDE_CATEGORIES[0],
  clients: GUIDE_CATEGORIES[1],
  pricing: GUIDE_CATEGORIES[2],
  works: GUIDE_CATEGORIES[3],
  independent: GUIDE_CATEGORIES[4],
}
