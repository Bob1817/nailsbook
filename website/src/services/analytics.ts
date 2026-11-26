import type { ActiveDevice, ScenarioId } from '../components/demo/demoData'

export type DemoSurface = 'home' | 'standalone'

export type DemoEventName =
  | 'demo_scenario_select'
  | 'demo_step_complete'
  | 'demo_cta_click'
  | 'demo_mode_toggle'
  | 'demo_device_switch'

export interface DemoEventPayloadMap {
  demo_scenario_select: {
    scenario: ScenarioId
    previousScenario: ScenarioId
    trigger: 'tab' | 'next_button' | 'reset'
    surface: DemoSurface
  }
  demo_step_complete: {
    scenario: ScenarioId
    step: number
    totalSteps: number
    completed: boolean
    surface: DemoSurface
  }
  demo_cta_click: {
    target: 'scan_try' | 'apply_1v1' | 'full_page'
    scenario: ScenarioId
    step: number
    completed: boolean
    surface: DemoSurface
  }
  demo_mode_toggle: {
    guided: boolean
    scenario: ScenarioId
    surface: DemoSurface
  }
  demo_device_switch: {
    targetDevice: ActiveDevice
    viaToast: boolean
    scenario: ScenarioId
    step: number
    surface: DemoSurface
  }
}

export interface TrackedEventRecord<K extends DemoEventName = DemoEventName> {
  name: K
  payload: DemoEventPayloadMap[K]
  timestamp: string
  path: string
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    _hmt?: unknown[][]
    __ONLYNAIL_EVENTS__?: TrackedEventRecord[]
  }
}

const MAX_BUFFER_SIZE = 100
const eventBuffer: TrackedEventRecord[] = []

export function getTrackedEvents(): readonly TrackedEventRecord[] {
  return eventBuffer
}

export function clearTrackedEvents(): void {
  eventBuffer.length = 0
  if (typeof window !== 'undefined' && window.__ONLYNAIL_EVENTS__) {
    window.__ONLYNAIL_EVENTS__ = []
  }
}

export function trackDemoEvent<K extends DemoEventName>(
  name: K,
  payload: DemoEventPayloadMap[K]
): TrackedEventRecord<K> {
  const record: TrackedEventRecord<K> = {
    name,
    payload,
    timestamp: new Date().toISOString(),
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
  }

  eventBuffer.push(record)
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift()
  }

  if (typeof window === 'undefined') {
    return record
  }

  try {
    if (import.meta.env.DEV) {
      window.__ONLYNAIL_EVENTS__ = [...eventBuffer]
    }

    // 1. Browser CustomEvent for any local listener or tag manager
    window.dispatchEvent(new CustomEvent('onlynail:analytics', { detail: record }))

    // 2. Google Analytics 4 (gtag) if installed
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload)
    }

    // 3. Baidu Tongji (_hmt) if installed
    if (Array.isArray(window._hmt)) {
      window._hmt.push(['_trackEvent', 'interactive_demo', name, payload.scenario])
    }

    // 4. Optional first-party endpoint via sendBeacon when configured
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined
    if (endpoint && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(record)], { type: 'application/json' })
      navigator.sendBeacon(endpoint, blob)
    }
  } catch {
    // Analytics should never interrupt user interactions
  }

  return record
}
