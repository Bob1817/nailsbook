import { useLang } from '../i18n/LanguageContext'

function PhoneFrame({
  src,
  alt,
  label,
}: {
  src: string
  alt: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone body */}
      <div className="relative w-[180px] sm:w-[200px] lg:w-[220px]">
        {/* Outer shell */}
        <div className="rounded-[32px] border-[5px] border-[var(--nb-ink)] bg-[var(--nb-ink)] p-[3px] shadow-2xl shadow-black/20">
          {/* Screen area */}
          <div className="relative overflow-hidden rounded-[26px] bg-white">
            {/* Dynamic Island */}
            <div className="absolute left-1/2 top-[6px] z-10 h-[16px] w-[60px] -translate-x-1/2 rounded-full bg-[var(--nb-ink)]" />

            {/* Screenshot */}
            <img
              src={src}
              alt={alt}
              className="w-full object-cover"
              loading="eager"
            />

            {/* Bottom bar indicator */}
            <div className="absolute bottom-1 left-1/2 h-[3px] w-[80px] -translate-x-1/2 rounded-full bg-black/15" />
          </div>
        </div>

        {/* Side button hints */}
        <div className="absolute -left-[7px] top-[80px] h-[28px] w-[3px] rounded-l-sm bg-[var(--nb-ink)]" />
        <div className="absolute -left-[7px] top-[120px] h-[18px] w-[3px] rounded-l-sm bg-[var(--nb-ink)]" />
        <div className="absolute -left-[7px] top-[145px] h-[18px] w-[3px] rounded-l-sm bg-[var(--nb-ink)]" />
        <div className="absolute -right-[7px] top-[105px] h-[36px] w-[3px] rounded-r-sm bg-[var(--nb-ink)]" />
      </div>

      {/* Label */}
      <span className="rounded-full bg-surface/80 px-3 py-1 text-[11px] font-bold text-ink-muted shadow-sm backdrop-blur-sm">
        {label}
      </span>
    </div>
  )
}

export default function AppPreview() {
  const { t } = useLang()

  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-hidden="true" data-component="AppPreview">
      {/* Two phones side by side, card-style */}
      <div className="flex items-start justify-center gap-4 sm:gap-6">
        {/* Technician phone — slight left tilt */}
        <div className="-rotate-3 transition-transform hover:rotate-0 hover:scale-105">
          <PhoneFrame
            src="/preview-technician.jpg"
            alt="Technician App"
            label={t.preview.technician}
          />
        </div>

        {/* Client phone — slight right tilt, offset down */}
        <div className="mt-8 rotate-3 transition-transform hover:rotate-0 hover:scale-105">
          <PhoneFrame
            src="/preview-client.jpg"
            alt="Client App"
            label={t.preview.client}
          />
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute -inset-12 -z-10 rounded-full bg-gradient-to-br from-brand/15 via-accent-warm/10 to-brand-soft/15 blur-3xl animate-glow-pulse" />
    </div>
  )
}
