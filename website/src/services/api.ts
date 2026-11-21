const API_BASE = '/api'

/* ─── Featured Works ─── */

export interface HomepageFeaturedWork {
  id: number
  title: string
  coverUrl: string | null
  imageUrls: string[]
  tags: string[]
  technicianName: string
  technicianAvatarUrl: string | null
  likeCount: number
}

export interface PublicFeaturedWork {
  id: number
  title: string
  coverUrl: string
  images: string
  tags: string
  technician: {
    id: number
    name: string
    avatarUrl: string
    city: string
  }
}

export async function getHomepageFeaturedWorks(limit = 12): Promise<HomepageFeaturedWork[]> {
  const res = await fetch(`${API_BASE}/public/works/homepage-featured?limit=${limit}`)
  if (!res.ok) throw new Error('get featured works failed')
  return res.json() as Promise<HomepageFeaturedWork[]>
}

export async function getPublicFeaturedWorks(): Promise<PublicFeaturedWork[]> {
  const res = await fetch(`${API_BASE}/public/works/featured`)
  if (!res.ok) throw new Error('get public featured works failed')
  return res.json() as Promise<PublicFeaturedWork[]>
}

/* ─── Work Detail ─── */

export interface WorkComment {
  id: number
  content: string
  isPinned: boolean
  user: {
    id: number
    name: string
    avatarUrl: string
    role: string
  }
  replies: WorkComment[]
  createdAt: string
}

export interface WorkDetail {
  id: number
  title: string
  description: string | null
  tags: string[]
  coverUrl: string | null
  imageUrls: string[]
  likeCount: number
  commentCount: number
  technician: {
    id: number
    name: string
    avatarUrl: string
  }
  comments: WorkComment[]
  createdAt: string
}

export async function getWorkDetail(id: number): Promise<WorkDetail> {
  const res = await fetch(`${API_BASE}/public/works/${id}`)
  if (!res.ok) throw new Error('get work detail failed')
  return res.json() as Promise<WorkDetail>
}

/* ─── Artist Application ─── */

export interface ArtistApplicationPayload {
  name: string
  phone: string
  city: string
  wechat: string
  serviceMode?: string
  experience?: string
  specialty?: string
  note?: string
  followedMp?: boolean
}

export async function submitArtistApplication(data: ArtistApplicationPayload): Promise<unknown> {
  const body = {
    name: data.name,
    phone: data.phone,
    city: data.city,
    wechat: data.wechat,
    serviceMode: data.serviceMode || undefined,
    experience: data.experience || undefined,
    specialty: data.specialty || undefined,
    note: data.note || undefined,
    followedMp: data.followedMp || undefined,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${API_BASE}/artist-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error('submit application failed')
    return await res.json() as unknown
  } finally {
    clearTimeout(timeout)
  }
}

export interface ArtistApplicationProgress {
  status: 'pending' | 'approved' | 'rejected' | 'none'
  name?: string
  city?: string
  appliedAt?: string
  reviewedAt?: string
}

export async function getArtistApplicationProgress(phone: string): Promise<ArtistApplicationProgress> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE}/artist-applications/progress?phone=${encodeURIComponent(phone.trim())}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string }
      throw new Error(errData?.message || 'get progress failed')
    }
    return (await res.json()) as ArtistApplicationProgress
  } finally {
    clearTimeout(timeout)
  }
}

/* ─── Quick Quotes (快捷报价) ─── */

export async function createQuickQuote(data: {
  items: { name: string; priceFen: number; durationMinutes?: number }[];
  finalPriceFen: number;
  themeCode?: string;
  technicianName?: string;
  technicianPhone?: string;
  shopName?: string;
  adjustmentNote?: string;
}) {
  const response = await fetch(`${API_BASE}/public/quick-quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || '生成报价单失败');
  }
  return response.json();
}

export async function getQuickQuoteDetail(token: string) {
  const response = await fetch(`${API_BASE}/public/quick-quotes/${token}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.message || '获取报价单失败');
    (error as any).status = response.status;
    (error as any).code = err.code;
    throw error;
  }
  return response.json();
}

