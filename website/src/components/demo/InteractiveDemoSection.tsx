import { useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  QrCode,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LanguageContext'
import { trackDemoEvent, type DemoSurface } from '../../services/analytics'
import RealScreenPhone from './RealScreenPhone'
import { SCENARIOS, type ActiveDevice, type ScenarioId } from './demoData'

interface InteractiveDemoSectionProps {
  standalone?: boolean
  onOpenScan: (type: 'artist' | 'try' | 'follow', meta?: { workTitle?: string }) => void
}

export default function InteractiveDemoSection({
  standalone = false,
  onOpenScan,
}: InteractiveDemoSectionProps) {
  const { isZh } = useLang()

  const [scenario, setScenario] = useState<ScenarioId>('quote')
  const [stepIndex, setStepIndex] = useState<number>(0)
  const [guided, setGuided] = useState<boolean>(true)
  const [mobileDevice, setMobileDevice] = useState<ActiveDevice>('client')
  const [mobileToast, setMobileToast] = useState<{
    target: ActiveDevice
    textZh: string
    textEn: string
  } | null>(null)
  const [syncPulse, setSyncPulse] = useState<boolean>(false)

  useEffect(() => {
    SCENARIOS.forEach((sc) => {
      [
        sc.doneClientScreen,
        sc.doneArtistScreen,
        ...sc.steps.flatMap((st) => [st.clientScreen, st.artistScreen]),
      ].forEach((screen) => {
        if (screen?.src) {
          const img = new Image()
          img.src = screen.src
        }
      })
    })
  }, [])

  const surface: DemoSurface = standalone ? 'standalone' : 'home'
  const currentScenario = SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0]
  const totalSteps = currentScenario.steps.length
  const isCompleted = stepIndex >= totalSteps
  const activeStep = currentScenario.steps[Math.min(stepIndex, totalSteps - 1)]

  const clientScreen = isCompleted ? currentScenario.doneClientScreen : activeStep.clientScreen
  const artistScreen = isCompleted ? currentScenario.doneArtistScreen : activeStep.artistScreen

  const triggerSyncFeedback = (target: ActiveDevice, textZh: string, textEn: string) => {
    setSyncPulse(true)
    setMobileToast({ target, textZh, textEn })
    window.setTimeout(() => setSyncPulse(false), 900)
  }

  const switchScenario = (
    nextScenario?: ScenarioId,
    trigger: 'tab' | 'next_button' | 'reset' = 'reset'
  ) => {
    const targetId = nextScenario || scenario
    const targetMeta = SCENARIOS.find((s) => s.id === targetId) || SCENARIOS[0]
    trackDemoEvent('demo_scenario_select', {
      scenario: targetId,
      previousScenario: scenario,
      trigger,
      surface,
    })
    setScenario(targetId)
    setStepIndex(0)
    setMobileDevice(targetMeta.steps[0].actor)
    setMobileToast(null)
  }

  const handleAdvanceStep = () => {
    if (isCompleted) return
    const completedStepNumber = stepIndex + 1
    const nextIdx = stepIndex + 1
    const nextIsDone = nextIdx >= totalSteps

    setStepIndex(nextIdx)
    trackDemoEvent('demo_step_complete', {
      scenario,
      step: completedStepNumber,
      totalSteps,
      completed: nextIsDone,
      surface,
    })

    if (nextIsDone) {
      setSyncPulse(true)
      window.setTimeout(() => setSyncPulse(false), 900)
      setMobileToast(null)
      return
    }

    const nextStep = currentScenario.steps[nextIdx]
    if (nextStep.actor !== activeStep.actor) {
      triggerSyncFeedback(
        nextStep.actor,
        nextStep.actor === 'artist'
          ? `美甲师端已同步更新，点击切换查看：${nextStep.titleZh}`
          : `顾客端已同步更新，点击切换查看：${nextStep.titleZh}`,
        nextStep.actor === 'artist'
          ? `Artist screen updated — tap to view: ${nextStep.titleEn}`
          : `Client screen updated — tap to view: ${nextStep.titleEn}`
      )
    } else {
      setSyncPulse(true)
      window.setTimeout(() => setSyncPulse(false), 600)
    }
  }

  const handleJumpToStep = (idx: number) => {
    setStepIndex(idx)
    const targetStep = currentScenario.steps[idx]
    if (targetStep) {
      setMobileDevice(targetStep.actor)
    }
    setMobileToast(null)
  }

  const nextScenarioMeta =
    SCENARIOS[(SCENARIOS.findIndex((s) => s.id === scenario) + 1) % SCENARIOS.length]

  return (
    <section
      id="interactive-demo"
      className={standalone ? 'site-container pt-8 pb-16' : 'site-section site-container'}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="max-w-2xl">
          <p className="eyebrow">
            {standalone
              ? isZh
                ? 'INTERACTIVE DEMO · 真实界面双端演练'
                : 'INTERACTIVE DEMO · REAL SCREEN WALKTHROUGH'
              : isZh
                ? 'LIVE WALKTHROUGH · 真实小程序双端演示'
                : 'LIVE WALKTHROUGH · REAL MINI-PROGRAM DEMO'}
          </p>
          {standalone ? (
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-1">
              {isZh
                ? '直接点击真实小程序界面，体验双端实时联动。'
                : 'Tap directly on real Mini-Program screens to see live sync.'}
            </h1>
          ) : (
            <h2>
              {isZh
                ? '用真实小程序界面，3 步点完核心业务闭环。'
                : 'Walk through the real Mini-Program screens in 3 taps.'}
            </h2>
          )}
          <p className="section-intro">
            {isZh
              ? '以下均为 OnlyNail 线上小程序真实运行截图。点击真实画面上的高亮按钮，即可看到顾客端与美甲师工作台如何一步步配合。'
              : 'All screens below are real OnlyNail WeChat Mini-Program captures. Tap the highlighted real buttons to see Client and Artist screens respond.'}
          </p>
        </div>

        {/* Utility Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const nextGuided = !guided
              setGuided(nextGuided)
              trackDemoEvent('demo_mode_toggle', {
                guided: nextGuided,
                scenario,
                surface,
              })
            }}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              guided
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface text-ink-muted hover:text-ink'
            }`}
          >
            <Compass size={14} />
            {guided
              ? isZh
                ? '热区引导：已开启'
                : 'Hotspots: On'
              : isZh
                ? '纯净看图模式'
                : 'Clean View'}
          </button>
          <button
            type="button"
            onClick={() => switchScenario(undefined, 'reset')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-neutral-100 transition"
          >
            <RotateCcw size={13} />
            {isZh ? '重播当前剧本' : 'Replay'}
          </button>
          {!standalone && (
            <Link
              to="/demo"
              onClick={() =>
                trackDemoEvent('demo_cta_click', {
                  target: 'full_page',
                  scenario,
                  step: stepIndex,
                  completed: isCompleted,
                  surface,
                })
              }
              className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-neutral-100 transition"
            >
              {isZh ? '全屏演示页' : 'Full Page'}
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Main Real-Screen Stage Card */}
      <div className="rounded-3xl border border-line bg-surface p-4 sm:p-6 lg:p-8 shadow-xs">
        {/* Scenario Switcher Tabs */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5"
          role="tablist"
          aria-label={isZh ? '演示剧本切换' : 'Demo scenarios'}
        >
          {SCENARIOS.map((item) => {
            const active = item.id === scenario
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchScenario(item.id, 'tab')}
                className={`text-left rounded-2xl border p-3.5 transition ${
                  active
                    ? 'border-ink bg-ink text-white shadow-xs'
                    : 'border-line bg-brand-bg/60 text-ink hover:border-ink/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      active ? 'text-neutral-300' : 'text-ink-muted'
                    }`}
                  >
                    {isZh ? item.badgeZh : item.badgeEn}
                  </span>
                  {active && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {isCompleted
                        ? isZh
                          ? '已完成'
                          : 'Done'
                        : `${stepIndex + 1} / ${totalSteps}`}
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold mt-1">
                  {isZh ? item.titleZh : item.titleEn}
                </div>
                <span
                  className={`block text-xs mt-0.5 line-clamp-1 ${
                    active ? 'text-neutral-200' : 'text-ink-muted'
                  }`}
                >
                  {isZh ? item.subtitleZh : item.subtitleEn}
                </span>
              </button>
            )
          })}
        </div>

        {/* Step Progress Pills + Live Guidance Bar */}
        <div className="rounded-2xl border border-line bg-brand-bg px-4 py-3.5 mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {currentScenario.steps.map((s, idx) => {
              const done = stepIndex > idx
              const current = !isCompleted && stepIndex === idx
              return (
                <button
                  key={s.titleZh}
                  type="button"
                  onClick={() => handleJumpToStep(idx)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    current
                      ? 'bg-ink text-white'
                      : done
                        ? 'bg-active-surface text-ink border border-ink/20'
                        : 'bg-surface text-ink-muted border border-line hover:text-ink'
                  }`}
                >
                  <span>0{idx + 1}</span>
                  <span>{isZh ? s.titleZh : s.titleEn}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-line">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-bold text-white">
                  {isCompleted ? (
                    <>
                      <CheckCircle2 size={12} />
                      {isZh ? '闭环演练完成' : 'Walkthrough Complete'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={11} />
                      {isZh ? '操作指引' : 'Next Action'}
                    </>
                  )}
                </span>
                <span className="text-xs font-semibold text-ink">
                  {isCompleted
                    ? isZh
                      ? currentScenario.doneSummaryZh
                      : currentScenario.doneSummaryEn
                    : isZh
                      ? activeStep.hintZh
                      : activeStep.hintEn}
                </span>
              </div>
              {!isCompleted && (
                <p className="text-xs text-ink-muted">
                  <strong className="text-ink">{isZh ? '产品价值：' : 'Value: '}</strong>
                  {isZh ? activeStep.valueZh : activeStep.valueEn}
                </p>
              )}
            </div>

            {isCompleted ? (
              <button
                type="button"
                onClick={() => switchScenario(nextScenarioMeta.id, 'next_button')}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-action-pressed shrink-0"
              >
                {isZh
                  ? `体验下一个：${nextScenarioMeta.titleZh}`
                  : `Next: ${nextScenarioMeta.titleEn}`}
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAdvanceStep}
                className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-neutral-100 shrink-0"
              >
                {isZh ? '直接看下一步' : 'Next Step'}
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Device Switcher + Sync Toast (< lg) */}
        <div className="lg:hidden mb-4 space-y-2.5">
          <div className="grid grid-cols-2 rounded-2xl bg-brand-bg p-1 border border-line">
            <button
              type="button"
              onClick={() => {
                setMobileDevice('client')
                if (mobileToast?.target === 'client') setMobileToast(null)
                trackDemoEvent('demo_device_switch', {
                  targetDevice: 'client',
                  viaToast: false,
                  scenario,
                  step: stepIndex,
                  surface,
                })
              }}
              className={`min-h-[42px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mobileDevice === 'client'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span>{isZh ? '顾客端真实界面' : 'Client Screen'}</span>
              {mobileToast?.target === 'client' && mobileDevice !== 'client' && (
                <span className="h-2 w-2 rounded-full bg-ink animate-ping" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileDevice('artist')
                if (mobileToast?.target === 'artist') setMobileToast(null)
                trackDemoEvent('demo_device_switch', {
                  targetDevice: 'artist',
                  viaToast: false,
                  scenario,
                  step: stepIndex,
                  surface,
                })
              }}
              className={`min-h-[42px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mobileDevice === 'artist'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span>{isZh ? '美甲师真实界面' : 'Artist Screen'}</span>
              {mobileToast?.target === 'artist' && mobileDevice !== 'artist' && (
                <span className="h-2 w-2 rounded-full bg-ink animate-ping" />
              )}
            </button>
          </div>

          {mobileToast && mobileToast.target !== mobileDevice && (
            <button
              type="button"
              onClick={() => {
                const target = mobileToast.target
                setMobileDevice(target)
                setMobileToast(null)
                trackDemoEvent('demo_device_switch', {
                  targetDevice: target,
                  viaToast: true,
                  scenario,
                  step: stepIndex,
                  surface,
                })
              }}
              className="w-full rounded-xl bg-ink px-3.5 py-2.5 text-left text-xs font-semibold text-white flex items-center justify-between gap-2 shadow-xs animate-fade-in-up"
            >
              <span>{isZh ? mobileToast.textZh : mobileToast.textEn}</span>
              <ArrowRight size={14} className="shrink-0" />
            </button>
          )}
        </div>

        {/* Dual Real-Screenshot Phone Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-4">
          <div className={mobileDevice === 'client' ? 'block' : 'hidden lg:block'}>
            <RealScreenPhone
              isZh={isZh}
              role="client"
              screen={clientScreen}
              isActiveTurn={!isCompleted && activeStep.actor === 'client'}
              guided={guided}
              hotspot={!isCompleted && activeStep.actor === 'client' ? activeStep.hotspot : null}
              onHotspotClick={handleAdvanceStep}
            />
          </div>

          {/* Center Sync Bridge (Desktop) */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-2 px-2">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition duration-300 ${
                syncPulse
                  ? 'border-ink bg-ink text-white scale-110'
                  : 'border-line bg-brand-bg text-ink'
              }`}
            >
              <ArrowLeftRight size={18} />
            </div>
            <span className="text-[11px] font-semibold text-ink-muted whitespace-nowrap">
              {syncPulse
                ? isZh
                  ? '双端同步中…'
                  : 'Syncing…'
                : isZh
                  ? '真机双端联动'
                  : 'Live Sync'}
            </span>
          </div>

          <div className={mobileDevice === 'artist' ? 'block' : 'hidden lg:block'}>
            <RealScreenPhone
              isZh={isZh}
              role="artist"
              screen={artistScreen}
              isActiveTurn={!isCompleted && activeStep.actor === 'artist'}
              guided={guided}
              hotspot={!isCompleted && activeStep.actor === 'artist' ? activeStep.hotspot : null}
              onHotspotClick={handleAdvanceStep}
            />
          </div>
        </div>

        {/* Bottom Conversion Bar */}
        <div className="mt-7 pt-5 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-ink-muted">
            <strong className="text-ink">
              {isZh ? '想亲自在微信里打开真实小程序？' : 'Want to try the real Mini-Program in WeChat?'}
            </strong>{' '}
            <span>
              {isZh
                ? '免费注册即用，无需审批；也可以预约官方 1v1 协助整理价目与作品。'
                : 'Free to start with zero approval wait, or book a 1-on-1 setup session.'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                trackDemoEvent('demo_cta_click', {
                  target: 'scan_try',
                  scenario,
                  step: stepIndex,
                  completed: isCompleted,
                  surface,
                })
                onOpenScan('try')
              }}
              className="site-button small"
            >
              <QrCode size={15} />
              {isZh ? '微信扫码真机体验' : 'Try in WeChat'}
            </button>
            <Link
              to="/apply"
              onClick={() =>
                trackDemoEvent('demo_cta_click', {
                  target: 'apply_1v1',
                  scenario,
                  step: stepIndex,
                  completed: isCompleted,
                  surface,
                })
              }
              className="site-button small secondary"
            >
              {isZh ? '预约 1v1 配置' : 'Book 1v1 Setup'}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
