import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { LanguageProvider } from '../i18n/LanguageContext'
import GuidesListPage from './GuidesListPage'
import GuideCategoryPage from './GuideCategoryPage'
import GuideDetailPage from './GuideDetailPage'
import { publishedGuides } from '../content/guides'

function renderWithRouter(initialPath: string) {
  return render(
    <HelmetProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/guides" element={<GuidesListPage />} />
            <Route path="/guides/category/:key" element={<GuideCategoryPage />} />
            <Route path="/guides/:slug" element={<GuideDetailPage />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </HelmetProvider>,
  )
}

describe('Guides pages', () => {
  it('renders all 40 published guides grouped by 5 categories on /guides', () => {
    renderWithRouter('/guides')
    expect(publishedGuides).toHaveLength(40)
    expect(
      screen.getByRole('heading', { level: 1, name: /独立与自由美甲师的接单与经营指南/ }),
    ).toBeInTheDocument()
    for (const cat of ['获客接单', '客户预约', '报价定价', '作品包装', '单干经营']) {
      expect(screen.getByRole('heading', { level: 2, name: cat })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: /独立美甲师没有实体店，怎么接单？/ })).toHaveAttribute(
      'href',
      '/guides/no-store-orders',
    )
    expect(
      screen.getByRole('link', { name: /客户总是爽约、迟到，美甲师怎么提前定规则？/ }),
    ).toHaveAttribute('href', '/guides/no-show-and-late-rules')
  })

  it('renders category page /guides/category/:key with guides', () => {
    renderWithRouter('/guides/category/clients')
    expect(
      screen.getByRole('heading', { level: 1, name: '客户预约指南' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/CATEGORY · 共 \d+ 篇/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /上门美甲出发前要跟客户确认什么？/ }),
    ).toHaveAttribute('href', '/guides/home-visit-confirm-checklist')
  })

  it('renders 7-section detail structure, 4-level breadcrumb, and /demo CTA on /guides/:slug', () => {
    renderWithRouter('/guides/manage-clients')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '独立美甲师怎么管理客户？客户多了记不住怎么办？',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('直接结论')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '在 OnlyNail 里怎么处理' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '常见问题' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '相关指南' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /进入样板间体验/ })).toHaveAttribute('href', '/demo')

    const breadcrumb = screen.getByRole('navigation', { name: '面包屑导航' })
    expect(breadcrumb).toHaveTextContent('首页')
    expect(breadcrumb).toHaveTextContent('指南')
    expect(breadcrumb).toHaveTextContent('客户预约')
  })

  it('renders friendly 404 state with back link for unknown slug', () => {
    renderWithRouter('/guides/non-existent-slug')
    expect(screen.getByRole('heading', { level: 1, name: '未找到这篇指南' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /返回指南列表/ })).toHaveAttribute('href', '/guides')
  })
})
