import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageContext'
import FlagshipShowcaseSection from './FlagshipShowcaseSection'

function renderSection(onOpenScan = vi.fn()) {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <FlagshipShowcaseSection onOpenScan={onOpenScan} />
      </LanguageProvider>
    </BrowserRouter>
  )
}

describe('FlagshipShowcaseSection', () => {
  it('renders benchmark studio details, hero works, and triggers scan modal', async () => {
    const handleScan = vi.fn()
    renderSection(handleScan)

    // Heading & Studio
    expect(screen.getByText(/标杆样板店/i)).toBeInTheDocument()
    expect(screen.getByText(/听栖美甲工作室 · 贝贝/i)).toBeInTheDocument()
    expect(screen.getByText(/中国美院本硕毕业/i)).toBeInTheDocument()

    // Price summary
    expect(screen.getByText(/实色 ¥168/i)).toBeInTheDocument()

    // Triggering scan modal for studio
    const scanButton = screen.getByRole('button', { name: /微信扫码进店预约/i })
    expect(scanButton).toBeInTheDocument()
    fireEvent.click(scanButton)
    expect(handleScan).toHaveBeenCalledWith('artist')
  })
})
