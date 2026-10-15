import { useState, type ReactNode } from 'react'
import { scanCodes, type ScanType } from './ScanQrModal'

interface ScanQrButtonProps {
  type: ScanType
  onClick: () => void
  children: ReactNode
  className?: string
}

/**
 * 扫码按钮：桌面端 hover 时在按钮上方滑出二维码预览，
 * 点击时触发弹窗（弹窗常显二维码，含下载／复制名称）。
 * 移动端无 hover，直接点击进入弹窗。
 */
export default function ScanQrButton({ type, onClick, children, className = '' }: ScanQrButtonProps) {
  const [hover, setHover] = useState(false)
  const code = scanCodes[type]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={className}
      >
        {children}
      </button>

      {/* Hover popover：桌面端预览 */}
      <div
        role="presentation"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 w-[150px] -translate-x-1/2 transition-all duration-200 ${
          hover ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <div className="rounded-2xl border border-line bg-surface p-2 shadow-xl">
          <img
            src={code.src}
            alt={code.alt}
            width={150}
            height={150}
            className="rounded-xl"
          />
          <p className="mt-1.5 text-center text-[11px] font-bold text-ink-muted">{code.name}</p>
        </div>
      </div>
    </div>
  )
}
