import { MousePointerClick } from 'lucide-react'
import type { ActiveDevice, ScreenFrame, ScreenHotspot } from './demoData'
import './RealScreenPhone.css'

interface RealScreenPhoneProps {
  isZh: boolean
  role: ActiveDevice
  screen: ScreenFrame
  isActiveTurn: boolean
  guided: boolean
  hotspot?: ScreenHotspot | null
  onHotspotClick?: () => void
}

export default function RealScreenPhone({
  isZh,
  role,
  screen,
  isActiveTurn,
  guided,
  hotspot,
  onHotspotClick,
}: RealScreenPhoneProps) {
  const roleLabel =
    role === 'client'
      ? isZh
        ? '顾客端 · 真实小程序'
        : 'Client · Mini-Program'
      : isZh
        ? '美甲师端 · 真实工作台'
        : 'Artist · Workbench'

  const showHotspot = Boolean(hotspot && isActiveTurn && onHotspotClick)

  return (
    <div className="nb-phone-wrapper">
      {/* Device Role Header */}
      <div className="mb-4 flex items-center gap-2 min-h-[28px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink shadow-xs">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isActiveTurn ? 'bg-ink' : 'bg-neutral-400'}`}
          />
          {roleLabel}
        </span>
        {isActiveTurn && (
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium text-inverse">
            {isZh ? '点击界面体验' : 'Tap screen'}
          </span>
        )}
      </div>

      {/* Studio-grade iPhone Pro Hardware Chassis */}
      <div className="nb-phone-chassis">
        <span aria-hidden="true" className="nb-phone-btn nb-phone-btn-action" />
        <span aria-hidden="true" className="nb-phone-btn nb-phone-btn-vol-up" />
        <span aria-hidden="true" className="nb-phone-btn nb-phone-btn-vol-down" />
        <span aria-hidden="true" className="nb-phone-btn nb-phone-btn-power" />

        <div className={`nb-phone-frame ${isActiveTurn ? 'is-active' : 'is-idle'}`}>
          <div className="nb-phone-bezel">
            <div className="nb-phone-screen">
              <img
                key={screen.src}
                src={screen.src}
                alt={isZh ? screen.altZh : screen.altEn}
                className={`nb-phone-screen-img ${screen.hasBakedFrame ? 'has-baked-frame' : ''}`}
                loading="eager"
              />

              <div aria-hidden="true" className="nb-phone-glare" />

              {!screen.hasBakedFrame && (
                <div aria-hidden="true" className="nb-phone-island">
                  <span className="nb-phone-camera" />
                </div>
              )}

              {!screen.hasBakedFrame && <div aria-hidden="true" className="nb-phone-home-bar" />}

              {showHotspot && hotspot && (
                <button
                  type="button"
                  onClick={onHotspotClick}
                  aria-label={isZh ? hotspot.labelZh : hotspot.labelEn}
                  style={{
                    left: `${hotspot.leftPct}%`,
                    top: `${hotspot.topPct}%`,
                    width: `${hotspot.widthPct}%`,
                    height: `${hotspot.heightPct}%`,
                  }}
                  className="group absolute z-30 rounded-xl focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {guided && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-xl border-2 border-ink bg-white/15 shadow-[0_0_0_4px_rgba(255,255,255,0.85)] animate-pulse"
                    />
                  )}

                  {guided && (
                    <span
                      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[11px] font-bold text-inverse shadow-md transition group-hover:scale-105 ${
                        hotspot.tooltipPos === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
                      }`}
                    >
                      <MousePointerClick size={12} className="shrink-0" />
                      <span>{isZh ? hotspot.labelZh : hotspot.labelEn}</span>
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real Screen Caption */}
      <p className="mt-4 text-center text-xs font-medium text-ink-muted">
        {isZh ? screen.captionZh : screen.captionEn}
      </p>
    </div>
  )
}
