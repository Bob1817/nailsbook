import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton, SkeletonCard } from './Skeleton'

describe('Skeleton', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('animate-pulse', 'bg-[var(--nb-pressed)]', 'rounded')
  })

  it('renders circle variant', () => {
    render(<Skeleton variant="circle" />)
  })

  it('renders text variant', () => {
    render(<Skeleton variant="text" />)
  })
})

describe('SkeletonCard', () => {
  it('renders multiple skeleton cards', () => {
    render(<SkeletonCard count={3} />)
  })
})
