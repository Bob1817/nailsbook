import { useEffect, useState, useCallback, useMemo } from 'react'
import { ArrowLeft, ImageOff, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { getPublicFeaturedWorks, type PublicFeaturedWork } from '../services/api'
import WorkDetailModal from '../components/WorkDetailModal'
import { SkeletonCard } from '../components/Skeleton'
import { Meta } from '../components/Meta'

/* ─── Masonry Card ─── */

function MasonryCard({
  work,
  onClick,
}: {
  work: PublicFeaturedWork
  onClick: () => void
}) {
  const tags = work.tags ? work.tags.split(',').filter(Boolean) : []
  const coverUrl = work.coverUrl || null

  return (
    <article
      className="group mb-4 cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg break-inside-avoid"
      onClick={onClick}
    >
      {/* Image — natural height for waterfall effect */}
      <div className="relative overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={work.title}
            className="w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-soft-pink to-brand-mist">
            <ImageOff className="h-8 w-8 text-brand/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="text-[14px] font-bold leading-snug text-ink line-clamp-2">{work.title}</h3>
        <div className="mt-2 flex items-center gap-2">
          {work.technician.avatarUrl && (
            <img
              src={work.technician.avatarUrl}
              alt={work.technician.name}
              loading="lazy"
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
          <span className="text-[12px] font-medium text-brand">{work.technician.name}</span>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-brand-mist px-2 py-0.5 text-[10px] font-medium text-brand">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

/* ─── Gallery Page ─── */

export default function WorksGalleryPage() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [works, setWorks] = useState<PublicFeaturedWork[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    getPublicFeaturedWorks()
      .then((data) => {
        setWorks(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    works.forEach((work) => {
      if (work.tags) {
        work.tags.split(',').forEach((tag) => {
          if (tag.trim()) tags.add(tag.trim())
        })
      }
    })
    return Array.from(tags)
  }, [works])

  // Filter works based on search and tags
  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchesSearch = searchQuery
        ? work.title.toLowerCase().includes(searchQuery.toLowerCase())
        : true

      const matchesTag = selectedTag
        ? work.tags?.split(',').some((tag) => tag.trim() === selectedTag)
        : true

      return matchesSearch && matchesTag
    })
  }, [works, searchQuery, selectedTag])

  const handleCloseDetail = useCallback(() => setSelectedWorkId(null), [])

  return (
    <>
      <Meta title={t.gallery.title} />
      <div className="min-h-screen bg-brand-bg">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 md:px-10">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-ink-muted transition hover:text-brand active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight text-ink">{t.gallery.title}</h1>
            <p className="text-[12px] text-ink-soft">{t.gallery.subtitle}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mx-auto max-w-6xl px-5 py-4 md:px-10">
          {/* Search */}
          <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <label htmlFor="gallery-search" className="sr-only">{t.gallery.searchPlaceholder}</label>
              <input
                id="gallery-search"
                type="text"
                placeholder={t.gallery.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-line bg-brand-bg pl-10 pr-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
            </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selectedTag === null
                      ? 'bg-brand text-white'
                      : 'bg-surface text-ink-muted hover:bg-brand-mist'
                  }`}
                >
                  {t.gallery.all}
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      selectedTag === tag
                        ? 'bg-brand text-white'
                        : 'bg-surface text-ink-muted hover:bg-brand-mist'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">
        {loading ? (
          <SkeletonCard count={8} />
        ) : filteredWorks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <p className="text-ink-muted">{t.gallery.empty}</p>
            {(searchQuery || selectedTag) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedTag(null)
                }}
                className="text-sm font-medium text-brand underline"
              >
                清除筛选
              </button>
            )}
          </div>
        ) : (
          /* Masonry / Waterfall layout using CSS columns */
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {filteredWorks.map((work) => (
              <MasonryCard
                key={work.id}
                work={work}
                onClick={() => setSelectedWorkId(work.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Work detail modal */}
      {selectedWorkId !== null && (
        <WorkDetailModal workId={selectedWorkId} onClose={handleCloseDetail} />
      )}
    </div>
    </>
  )
}
