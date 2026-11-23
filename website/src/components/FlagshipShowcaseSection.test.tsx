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
  it('renders artist page preview example and triggers scan modal', async () => {
    const handleScan = vi.fn()
    renderSection(handleScan)

    expect(screen.getByText(/真实配置样板/i)).toBeInTheDocument()
    expect(screen.getByText(/听栖美甲工作室 · 贝贝/i)).toBeInTheDocument()
    expect(screen.getByText(/自主上传作品、自由定价/i)).toBeInTheDocument()

    const scanButton = screen.getByRole('button', { name: /微信扫码预览效果/i })
    expect(scanButton).toBeInTheDocument()
    fireEvent.click(scanButton)
    expect(handleScan).toHaveBeenCalledWith('artist')
  })
})
