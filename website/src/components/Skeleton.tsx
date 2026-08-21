import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'rect' | 'circle' | 'text'
  width?: string | number
  height?: string | number
}

export function Skeleton({ className = '', variant = 'rect', width, height }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gray-200'
  
  let variantClass = ''
  switch (variant) {
    case 'circle':
      variantClass = 'rounded-full'
      break
    case 'text':
      variantClass = 'h-4 w-3/4 rounded'
      break
    default:
      variantClass = 'rounded'
  }

  const style: React.CSSProperties = {}
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height

  return <div className={`${baseClass} ${variantClass} ${className}`} style={style} />
}

interface SkeletonCardProps {
  count?: number
}

export function SkeletonCard({ count = 6 }: SkeletonCardProps) {
  return (
    <div className="columns-2 gap-4 lg:columns-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="group mb-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <Skeleton variant="rect" height={200} className="w-full" />
          <div className="p-3.5 space-y-2">
            <Skeleton variant="text" />
            <div className="flex items-center gap-2">
              <Skeleton variant="circle" width={20} height={20} />
              <Skeleton variant="text" width={100} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
