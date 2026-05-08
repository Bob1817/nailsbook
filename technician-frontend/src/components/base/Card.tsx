import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', style, ...props }: CardProps) {
  return (
    <div
      className={`rounded-card bg-card shadow-[0_10px_30px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04] ${className}`.trim()}
      style={style}
      {...props}
    />
  );
}
