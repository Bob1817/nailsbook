import { useEffect, useState, useCallback } from 'react'
import { ImageOff, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { getPublicFeaturedWorks, type PublicFeaturedWork } from '../services/api'
import WorkDetailModal from './WorkDetailModal'
import { SkeletonCard } from './Skeleton'

/* ─── Work Card ─── */

function WorkCard({
  work,
  onClick,
}: {
  work: PublicFeaturedWork
  index: number
  onClick: () => void
}) {
  const coverUrl = work.coverUrl || null
  const tags = work.tags ? work.tags.split(',').filter(Boolean) : []

  return (
    <article
      className="group mb-4 cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg break-inside-avoid"
      onClick={onClick}
    >
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
            <ImageOff className="h-8 w-8 text-brand/30" aria-hidden="true" />
          </div>
        )}
      </div>

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

/* ─── Featured Works Section ─── */

export default function FeaturedWorksSection() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [works, setWorks] = useState<PublicFeaturedWork[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null)

  useEffect(() => {
    getPublicFeaturedWorks()
      .then((data) => {
        setWorks(data)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [])

  const handleCloseDetail = useCallback(() => setSelectedWorkId(null), [])

  return (
    <section
      id="works"
      className="px-5 py-20 md:px-10 lg:px-16"
      data-component="FeaturedWorks"
      style={{ scrollMarginTop: '5rem' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.1em] text-brand uppercase">{t.works.tag}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-[42px] md:leading-tight">
              {t.works.title}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden max-w-xs text-sm leading-relaxed text-ink-muted md:block">
              {loaded && works.length > 0 ? t.works.descLive : t.works.descFallback}
            </p>
            <button
              type="button"
              onClick={() => navigate('/gallery')}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/30 bg-surface px-5 py-2.5 text-[13px] font-bold text-brand transition hover:border-brand hover:bg-brand-mist active:scale-[0.98]"
            >
              {t.works.viewMore}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <div className="mt-10">
          {!loaded ? (
            <SkeletonCard count={6} />
          ) : (
            <div className="columns-2 gap-4 lg:columns-3">
              {works.map((work, i) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  index={i}
                  onClick={() => setSelectedWorkId(work.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Work detail modal */}
      {selectedWorkId !== null && (
        <WorkDetailModal workId={selectedWorkId} onClose={handleCloseDetail} />
      )}
    </section>
  )
}
