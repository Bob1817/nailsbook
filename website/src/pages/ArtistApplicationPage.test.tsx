import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { LanguageProvider } from '../i18n/LanguageContext'
import ArtistApplicationPage from './ArtistApplicationPage'

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <LanguageProvider>
          <ArtistApplicationPage />
        </LanguageProvider>
      </MemoryRouter>
    </HelmetProvider>
  )
}
async function fillApplication(user: ReturnType<typeof userEvent.setup>, mode = 'shop') {
  await user.type(screen.getByLabelText(/称呼/), ' 测试美甲师 ')
  await user.type(screen.getByLabelText(/手机号/), '13800138000')
  await user.type(screen.getByLabelText(/所在城市/), '杭州')
  await user.type(screen.getByLabelText(/微信号/), 'test_artist')
  await user.selectOptions(screen.getByLabelText(/服务方式/), mode)
}

describe('invitation application', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('rejects empty and invalid fields without a network request', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '提交申请' }))
    expect(await screen.findByText('请输入有效的中国大陆手机号')).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/称呼/)).toHaveFocus()
  })

  it.each(['shop', 'home', 'both'])(
    'submits %s without requiring a follow or exposing phone status',
    async (mode) => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ received: true }) })
      renderPage()
      const user = userEvent.setup()
      await fillApplication(user, mode)
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '提交申请' }))
      expect(await screen.findByText('申请已收到')).toBeVisible()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/artist-applications')
      expect(JSON.parse(options.body)).toMatchObject({ name: '测试美甲师', serviceMode: mode })
      expect(JSON.parse(options.body).followedMp).not.toBe(true)
    }
  )

  it('keeps values on failure and can retry successfully', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ received: true }) })
    renderPage()
    const user = userEvent.setup()
    await fillApplication(user)
    await user.click(screen.getByRole('button', { name: '提交申请' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('你的填写内容已保留')
    expect(screen.getByLabelText(/微信号/)).toHaveValue('test_artist')
    await user.click(screen.getByRole('button', { name: '提交申请' }))
    expect(await screen.findByText('申请已收到')).toBeVisible()
  })

  it('prevents another submit while the first request is pending', async () => {
    let resolve!: (value: unknown) => void
    fetchMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        })
    )
    renderPage()
    const user = userEvent.setup()
    await fillApplication(user)
    await user.dblClick(screen.getByRole('button', { name: '提交申请' }))
    expect(screen.getByRole('button', { name: '正在提交…' })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    resolve({ ok: true, json: async () => ({ received: true }) })
    await waitFor(() => expect(screen.getByText('申请已收到')).toBeVisible())
  })
})
