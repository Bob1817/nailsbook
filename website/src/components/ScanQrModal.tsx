import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, Copy, Check } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'

export type ScanType = 'follow' | 'try'

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
}

interface ScanQrModalProps {
  type: ScanType
  onClose: () => void
}

export default function ScanQrModal({ type, onClose }: ScanQrModalProps) {
  const { t, isZh } = useLang()
  const [copied, setCopied] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const code = scanCodes[type]
  const title = type === 'follow' ? t.scanModal.followTitle : t.scanModal.tryTitle
  const hint = type === 'follow' ? t.scanModal.followHint : t.scanModal.tryHint
  const copyLabel = type === 'follow' ? t.scanModal.copyMpName : t.scanModal.copyAppName

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
      await navigator.clipboard.writeText(code.name)
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
        <div className="mt-4 rounded-2xl border border-line bg-white p-3">
          <img
            src={code.src}
            alt={code.alt}
            width={240}
            height={240}
            className="mx-auto rounded-xl"
          />
        </div>
        <p className="mt-4 text-[13px] text-ink-muted">{hint}</p>

        <div className="mt-5 flex gap-2">
          <a
            href={code.src}
            download
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
              ? `未能复制，请在微信中搜索「${code.name}」。`
              : `Could not copy. Search for ${code.name} in WeChat.`
            : copied
              ? t.scanModal.copied
              : ''}
        </p>
      </div>
    </div>,
    document.body
  )
}
