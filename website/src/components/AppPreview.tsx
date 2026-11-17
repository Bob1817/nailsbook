import { useState } from 'react'
import { useLang } from '../i18n/LanguageContext'

interface PhoneFrameProps {
  src: string
  alt: string
  label: string
}

function PhoneFrame({ src, alt, label }: PhoneFrameProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-3">
      {/* Phone container with realistic depth shadow */}
      <div className="relative w-[148px] sm:w-[190px] lg:w-[220px]">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto block rounded-[34px] sm:rounded-[42px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.32)] ring-1 ring-black/10 select-none pointer-events-none"
          loading="eager"
        />
      </div>

      {/* Label */}
      <span className="rounded-full bg-surface border border-line px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-ink shadow-xs text-center whitespace-nowrap">
        {label}
      </span>
    </div>
  )
}

export default function AppPreview() {
  const { isZh } = useLang()
  const [view, setView] = useState<'overview' | 'detail'>('overview')

  return (
    <div className="app-preview-container">
      {/* Perspective Toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-xl bg-neutral-100 p-1 border border-line">
          <button
            type="button"
            onClick={() => setView('overview')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold transition ${
              view === 'overview'
                ? 'bg-white text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {isZh ? '日常经营与预约' : 'Overview'}
          </button>
          <button
            type="button"
            onClick={() => setView('detail')}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold transition ${
              view === 'detail'
                ? 'bg-white text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {isZh ? '高定款式与老客CRM' : 'Detail & CRM'}
          </button>
        </div>
      </div>

      {/* Two Phones Side by Side */}
      <div className="flex items-start justify-center gap-3 sm:gap-6">
        {/* Phone 1: Technician App */}
        <div className="-rotate-1 sm:-rotate-2 transition-transform hover:rotate-0 hover:scale-105 duration-300">
          <PhoneFrame
            src={view === 'overview' ? '/preview-technician.png' : '/preview-technician-crm.png'}
            alt="美甲师端真实界面"
            label={
              view === 'overview'
                ? isZh
                  ? '美甲师端 · 经营看板与待报价'
                  : 'Artist Workbench & Revenue'
                : isZh
                  ? '美甲师端 · 智能复购与客群CRM'
                  : 'Artist CRM & Retention'
            }
          />
        </div>

        {/* Phone 2: Client App */}
        <div className="mt-4 sm:mt-6 rotate-1 sm:rotate-2 transition-transform hover:rotate-0 hover:scale-105 duration-300">
          <PhoneFrame
            src={view === 'overview' ? '/preview-client.png' : '/preview-work-detail.png'}
            alt="顾客端真实界面"
            label={
              view === 'overview'
                ? isZh
                  ? '顾客端 · 发现与预约日程'
                  : 'Client Discovery & Booking'
                : isZh
                  ? '顾客端 · 高定款式与美甲师档案'
                  : 'Work Detail & Artist Profile'
            }
          />
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-muted">
        {isZh
          ? '微信小程序真实界面实测截图 · 顾客微信扫码直达 · 美甲师专属经营后台'
          : 'Authentic WeChat Mini-Program screenshots · Instant access without app download'}
      </p>
    </div>
  )
}
