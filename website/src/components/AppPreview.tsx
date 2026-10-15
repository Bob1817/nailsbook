import { useState } from 'react'
import { ArrowUpRight, CalendarDays, Check, NotebookPen, UserRound } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { recruitment } from '../content/recruitment'

export default function AppPreview() {
  const { lang } = useLang()
  const c = recruitment[lang]
  const [active, setActive] = useState(0)
  const screen = c.demoScreens[active]
  const Icon = [UserRound, CalendarDays, NotebookPen][active]
  return (
    <div className="product-demo">
      <div className="demo-switches" role="group" aria-label={c.demoTitle}>
        {c.demoTabs.map((name, i) => (
          <button key={name} aria-pressed={active === i} onClick={() => setActive(i)}>
            {name}
          </button>
        ))}
      </div>
      <div className="demo-window" aria-live="polite">
        <div className="demo-window-bar">
          <span>OnlyNail</span>
          <span className="demo-window-mark">
            <span />
            <span />
            <span />
          </span>
        </div>
        <div className="demo-content">
          <span className="demo-icon">
            <Icon size={25} strokeWidth={1.4} />
          </span>
          <p className="fine-print">{screen.subtitle}</p>
          <h3>{screen.title}</h3>
          <div className="demo-list-label">
            {screen.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </div>
          <div className="demo-rows">
            {screen.rows.map(([label, text]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{text}</strong>
                <Check size={15} aria-hidden="true" />
              </div>
            ))}
          </div>
          <p className="demo-foot">{screen.foot}</p>
        </div>
      </div>
      <p className="demo-caption">{c.demoLabel}</p>
    </div>
  )
}
