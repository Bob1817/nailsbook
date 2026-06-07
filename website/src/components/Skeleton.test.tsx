import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton, SkeletonCard } from './Skeleton'

describe('Skeleton', () => {
  it('renders correctly with default props', () => {
    render(<Skeleton />)
    const skeleton = screen.getByRole('generic')
    expect(skeleton).toBeInTheDocument()
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
