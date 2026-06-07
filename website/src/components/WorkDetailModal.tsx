import { useEffect, useState } from 'react'
import { Heart, ImageOff, X, MessageSquare, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { getWorkDetail, type WorkDetail } from '../services/api'

export default function WorkDetailModal({ workId, onClose }: { workId: number; onClose: () => void }) {
  const { t } = useLang()
  const [detail, setDetail] = useState<WorkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    setLoading(true)
    getWorkDetail(workId)
      .then((data) => {
        setDetail(data)
        setActiveImage(0)
      })
      .finally(() => setLoading(false))
  }, [workId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    // prevent body scroll while modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[28px] bg-surface shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {loading ? (
          <div className="flex h-80 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : detail ? (
          <>
            {/* Image gallery */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-soft-pink to-brand-mist">
              {detail.imageUrls.length > 0 ? (
                <>
                  <img
                    src={detail.imageUrls[activeImage]}
                    alt={detail.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {detail.imageUrls.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveImage((prev) => (prev > 0 ? prev - 1 : detail.imageUrls.length - 1))}
                        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink shadow-md backdrop-blur-sm transition hover:bg-white"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImage((prev) => (prev < detail.imageUrls.length - 1 ? prev + 1 : 0))}
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink shadow-md backdrop-blur-sm transition hover:bg-white"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {detail.imageUrls.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActiveImage(i)}
                            className={`h-1.5 rounded-full transition ${
                              i === activeImage ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                            }`}
                            aria-label={`Go to image ${i + 1}`}
                            aria-current={i === activeImage}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageOff className="h-12 w-12 text-brand/30" />
                </div>
              )}
            </div>

            {/* Detail content */}
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-ink">{detail.title}</h2>
                  <div className="mt-2 flex items-center gap-2.5">
                    {detail.technician.avatarUrl && (
                      <img
                        src={detail.technician.avatarUrl}
                        alt={detail.technician.name}
                        loading="lazy"
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    )}
                    <span className="text-[13px] font-bold text-brand">{detail.technician.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-soft-pink px-3 py-1.5 text-[12px] font-medium text-brand">
                  <Heart className="h-3.5 w-3.5 fill-brand" />
                  {detail.likeCount}
                </div>
              </div>

              {detail.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {detail.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-brand-mist px-3 py-1 text-[12px] font-medium text-brand">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {detail.description && (
                <div className="mt-5">
                  <h3 className="text-[13px] font-bold text-ink-muted">{t.works.description}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{detail.description}</p>
                </div>
              )}

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="flex items-center gap-2 text-[13px] font-bold text-ink-muted">
                  <MessageSquare className="h-4 w-4" />
                  {t.works.comments} ({detail.commentCount})
                </h3>
                {detail.comments.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {detail.comments.map((comment) => (
                      <div key={comment.id} className="rounded-2xl bg-brand-bg p-4">
                        <div className="flex items-center gap-2">
                          {comment.user.avatarUrl && (
                            <img src={comment.user.avatarUrl} alt={comment.user.name} loading="lazy" className="h-6 w-6 rounded-full object-cover" />
                          )}
                          <span className="text-[12px] font-bold text-ink">{comment.user.name}</span>
                          <span className="text-[10px] text-ink-soft">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{comment.content}</p>
                        {comment.replies.length > 0 && (
                          <div className="mt-3 space-y-2 border-l-2 border-line pl-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id}>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-brand">{reply.user.name}</span>
                                  <span className="text-[10px] text-ink-soft">
                                    {new Date(reply.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-ink-soft">{t.works.noComments}</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
