import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageContext'
import ScanQrModal from './ScanQrModal'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <MemoryRouter>
      <LanguageProvider>
        <button onClick={() => setOpen(true)}>查看小程序</button>
        {open && <ScanQrModal type="try" onClose={() => setOpen(false)} />}
      </LanguageProvider>
    </MemoryRouter>
  )
}

describe('QR dialog keyboard navigation', () => {
  it('focuses close, wraps focus, and returns to the trigger on Escape', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: '查看小程序' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('link', { name: '查看样板间（网页免登录直达）' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
