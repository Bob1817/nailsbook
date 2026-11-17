import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, Copy, Check } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'

export type ScanType = 'follow' | 'try' | 'artist'

export const scanCodes = {
  follow: {
    src: '/wechat-mp-qrcode.jpg',
    alt: 'NailBook 公众号二维码',
    name: 'NailBook',
  },
  try: {
    src: '/miniprogram-code.jpg',
    alt: 'OnlyNail 小程序码',
    name: 'OnlyNail',
  },
  artist: {
    src: '/miniprogram-code.jpg',
    alt: '听栖美甲工作室 · 小程序码',
    name: 'OnlyNail',
  },
}

interface ScanQrModalProps {
  type: ScanType
  artistId?: number
  artistName?: string
  shopName?: string
  workTitle?: string
  onClose: () => void
}

export default function ScanQrModal({
  type,
  artistId = 55,
  artistName = '贝贝',
  shopName = '听栖美甲工作室',
  workTitle,
  onClose,
}: ScanQrModalProps) {
  const { t, isZh } = useLang()
  const [copied, setCopied] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const [artistQrSrc, setArtistQrSrc] = useState<string | null>(null)

  const isArtist = type === 'artist'
  const code = scanCodes[type]

  useEffect(() => {
    if (isArtist && artistId) {
      fetch(`/api/public/artist/id/${artistId}/share-code`)
        .then((res) => {
          if (!res.ok) throw new Error('fetch share code failed')
          return res.json()
        })
        .then((data) => {
          if (data && data.imageBase64) {
            setArtistQrSrc(`data:image/jpeg;base64,${data.imageBase64}`)
          }
        })
        .catch(() => {
          // fallback remains code.src
        })
    }
  }, [isArtist, artistId])

  const qrSrc = isArtist && artistQrSrc ? artistQrSrc : code.src
  const qrAlt = isArtist ? `${shopName} · 小程序码` : code.alt

  const title = isArtist
    ? isZh
      ? `${shopName} · 预约主页`
      : `${shopName} · Booking Page`
    : type === 'follow'
      ? t.scanModal.followTitle
      : t.scanModal.tryTitle

  const hint = isArtist
    ? workTitle
      ? isZh
        ? `微信扫码直达「${workTitle}」预约页面与详情。`
        : `Scan with WeChat to view "${workTitle}" and book.`
      : isZh
        ? '微信扫码直达美甲师主页，查看12款在架高定作品与服务报价；美甲师亦可体验线上店铺。'
        : 'Scan with WeChat to explore the artist homepage, 12 works and transparent pricing.'
    : type === 'follow'
      ? t.scanModal.followHint
      : t.scanModal.tryHint

  const copyLabel = isArtist
    ? isZh
      ? '复制美甲师微信'
      : 'Copy WeChat ID'
    : type === 'follow'
      ? t.scanModal.copyMpName
      : t.scanModal.copyAppName

  const textToCopy = isArtist ? 'Luna_Nails321' : code.name

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const root = document.getElementById('root')
    const wasInert = root?.inert ?? false
    if (root) root.inert = true
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button, a[href]')
      if (!controls?.length) return
      const first = controls[0],
        last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (root) root.inert = wasInert
      previousFocus?.focus()
    }
  }, [onClose])

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopyFailed(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      setCopyFailed(true)
    }
  }

  return createPortal(
    <div
      className="scan-modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        ref={dialog}
        className="scan-modal-panel relative my-auto max-h-[90dvh] w-full max-w-[360px] overflow-y-auto rounded-[20px] bg-surface p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition hover:text-ink active:scale-[0.95]"
          aria-label={t.scanModal.close}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h3 className="px-6 text-base font-semibold tracking-tight text-ink">{title}</h3>
        {isArtist && (
          <p className="mt-1 text-xs text-ink-muted">
            {artistName} · 中国美院本硕毕业 · 杭州西湖区
          </p>
        )}
        <div className="mt-4 rounded-2xl border border-line bg-white p-3">
          <img
            src={qrSrc}
            alt={qrAlt}
            width={240}
            height={240}
            className="mx-auto rounded-xl object-contain"
          />
        </div>
        <p className="mt-4 text-[13px] text-ink-muted">{hint}</p>

        <div className="mt-5 flex gap-2">
          <a
            href={qrSrc}
            download={isArtist ? `${shopName}-小程序码.jpg` : `${code.name}.jpg`}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-[13px] font-bold text-ink transition hover:border-brand/40 active:scale-[0.98]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t.scanModal.download}
          </a>
          <button
            type="button"
            onClick={copyName}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-[13px] font-bold text-ink transition hover:border-brand/40 active:scale-[0.98]"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? t.scanModal.copied : copyLabel}
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-muted" role="status">
          {copyFailed
            ? isZh
              ? `未能复制，请在微信中搜索「${textToCopy}」。`
              : `Could not copy. Search for ${textToCopy} in WeChat.`
            : copied
              ? t.scanModal.copied
              : ''}
        </p>
      </div>
    </div>,
    document.body
  )
}
