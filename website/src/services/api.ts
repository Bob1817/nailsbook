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
}

export type ApplicationStatus = 'none' | 'pending' | 'approved'

export interface CheckPhoneResult {
  status: ApplicationStatus
  message?: string
}

export async function checkPhoneStatus(phone: string): Promise<CheckPhoneResult> {
  const res = await fetch(`${API_BASE}/artist-applications/check-phone?phone=${encodeURIComponent(phone)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'check phone status failed')
  }
  return res.json() as Promise<CheckPhoneResult>
}

export async function submitArtistApplication(data: ArtistApplicationPayload): Promise<{ id: number }> {
  const body = {
    name: data.name,
    phone: data.phone,
    city: data.city,
    wechat: data.wechat,
    serviceMode: data.serviceMode || undefined,
    experience: data.experience || undefined,
    specialty: data.specialty || undefined,
    note: data.note || undefined,
  }

  const res = await fetch(`${API_BASE}/artist-applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'submit application failed')
  }

  return res.json() as Promise<{ id: number }>
}
