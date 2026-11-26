import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from '../../i18n/LanguageContext'
import { clearTrackedEvents, getTrackedEvents } from '../../services/analytics'
import InteractiveDemoSection from './InteractiveDemoSection'

function renderDemo(props?: {
  standalone?: boolean
  onOpenScan?: (type: 'artist' | 'try' | 'follow', meta?: { workTitle?: string }) => void
}) {
  const onOpenScan = props?.onOpenScan ?? vi.fn()
  const utils = render(
    <BrowserRouter>
      <LanguageProvider>
        <InteractiveDemoSection standalone={props?.standalone} onOpenScan={onOpenScan} />
      </LanguageProvider>
    </BrowserRouter>
  )
  return { ...utils, onOpenScan }
}

describe('InteractiveDemoSection (Real Screenshots)', () => {
  beforeEach(() => {
    clearTrackedEvents()
  })

  it('walks through Flow 01 (Portfolio to Quick Quote) using real screenshots and hotspots', () => {
    renderDemo()

    // Step 1: Real work detail screen on client side
    const clientImg1 = screen.getByAltText(/顾客端真实作品详情页/i)
    expect(clientImg1).toHaveAttribute('src', '/images/campaign-cases/case-work-detail.webp')

    fireEvent.click(screen.getByRole('button', { name: /点击「预约同款」/i }))

    // Step 2: Client switches to real booking status, Artist shows real pending quote workbench
    expect(screen.getByAltText(/顾客端真实首页与我的预约状态卡片/i)).toHaveAttribute(
      'src',
      '/preview-client.png'
    )
    expect(screen.getByAltText(/美甲师端真实工作台首页与下一单待报价卡片/i)).toHaveAttribute(
      'src',
      '/preview-technician.png'
    )

    fireEvent.click(screen.getByRole('button', { name: /点击「立即报价」/i }))

    // Step 3: Artist shows real itemized quote card preview
    expect(screen.getByAltText(/美甲师端真实快捷报价单预览/i)).toHaveAttribute(
      'src',
      '/images/campaign-cases/case-quick-quote.jpg'
    )

    fireEvent.click(screen.getByRole('button', { name: /点击「确认并分享」/i }))
    expect(screen.getByText(/闭环演练完成/i)).toBeInTheDocument()
  })

  it('walks through Flow 02 (Self-Booking & Client CRM) across real calendar and CRM screens', () => {
    renderDemo()

    fireEvent.click(screen.getByRole('tab', { name: /自助约档期与老客 CRM/i }))

    // Step 1: Real booking confirmation modal
    expect(screen.getByAltText(/顾客端真实预约时段选择与确认弹窗/i)).toHaveAttribute(
      'src',
      '/images/campaign-cases/case-booking-confirm.webp'
    )
    fireEvent.click(screen.getByRole('button', { name: /点击「提交申请」/i }))

    // Step 2: Real schedule calendar & monthly revenue
    expect(screen.getByAltText(/美甲师端真实行程日历与月度收入统计/i)).toHaveAttribute(
      'src',
      '/images/campaign-cases/case-schedule-calendar.webp'
    )
    fireEvent.click(screen.getByRole('button', { name: /查看排期与客群/i }))

    // Step 3: Real customer CRM & retention alert screen
    expect(screen.getByAltText(/美甲师端真实客户档案与复购提醒列表/i)).toHaveAttribute(
      'src',
      '/images/campaign-cases/case-customer-crm.webp'
    )
    fireEvent.click(screen.getByRole('button', { name: /点击查看复购提醒/i }))
    expect(screen.getByText(/闭环演练完成/i)).toBeInTheDocument()
  })

  it('walks through Flow 03 (Private Storefront & Pricing) across real studio and service screens', () => {
    renderDemo()

    fireEvent.click(screen.getByRole('tab', { name: /专属个人主页与透明价目/i }))

    expect(screen.getByAltText(/顾客端真实美甲师个人主页/i)).toHaveAttribute(
      'src',
      '/images/campaign-cases/case-artist-home.webp'
    )
    fireEvent.click(screen.getByRole('button', { name: /点击「查看客户预约入口」/i }))

    expect(screen.getByAltText(/顾客端真实工作室环境与地图导航页/i)).toHaveAttribute(
      'src',
      '/images/campaign-cases/case-shop-home.webp'
    )
    fireEvent.click(screen.getByRole('button', { name: /点击「分享店铺」/i }))

    expect(screen.getByAltText(/美甲师端真实服务项目管理与定金配置/i)).toHaveAttribute(
      'src',
      '/images/campaign-cases/case-service-list.webp'
    )
    fireEvent.click(screen.getByRole('button', { name: /点击查看服务配置/i }))
    expect(screen.getByText(/闭环演练完成/i)).toBeInTheDocument()
  })

  it('tracks scenario switch, step completion, replay, and conversion CTAs', () => {
    const handleScan = vi.fn()
    const gtagSpy = vi.fn()
    window.gtag = gtagSpy

    renderDemo({ standalone: true, onOpenScan: handleScan })

    fireEvent.click(screen.getByRole('tab', { name: /自助约档期与老客 CRM/i }))
    fireEvent.click(screen.getByRole('button', { name: /点击「提交申请」/i }))
    fireEvent.click(screen.getByRole('button', { name: /查看排期与客群/i }))
    fireEvent.click(screen.getByRole('button', { name: /点击查看复购提醒/i }))
    fireEvent.click(screen.getByRole('button', { name: /微信扫码真机体验/i }))

    const events = getTrackedEvents()
    expect(events.map((e) => e.name)).toEqual([
      'demo_scenario_select',
      'demo_step_complete',
      'demo_step_complete',
      'demo_step_complete',
      'demo_cta_click',
    ])
    expect(events[3].payload).toMatchObject({
      scenario: 'booking',
      step: 3,
      completed: true,
      surface: 'standalone',
    })
    expect(events[4].payload).toMatchObject({
      target: 'scan_try',
      scenario: 'booking',
      completed: true,
      surface: 'standalone',
    })
    expect(handleScan).toHaveBeenCalledWith('try')
    expect(gtagSpy).toHaveBeenCalledTimes(5)

    // Replay resets back to step 1
    fireEvent.click(screen.getByRole('button', { name: /重播当前剧本/i }))
    expect(screen.getByAltText(/顾客端真实预约时段选择与确认弹窗/i)).toBeInTheDocument()

    delete window.gtag
  })
})
