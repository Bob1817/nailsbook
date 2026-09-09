import React from 'react';

type TagVariant = 'primary' | 'success' | 'warning' | 'neutral';

const tagStyle: Record<TagVariant, React.CSSProperties> = {
  primary: { background: 'var(--nb-active-surface)', color: 'var(--nb-link)' },
  success: { background: 'var(--nb-page)', color: 'var(--nb-secondary)' },
  warning: { background: 'var(--nb-page)', color: 'var(--nb-ink)' },
  neutral: { background: 'var(--nb-page)', color: 'var(--nb-secondary)' },
};

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
}

export function Tag({ variant = 'neutral', className = '', style, ...props }: TagProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap ${className}`.trim()}
      style={{
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 12,
        lineHeight: '18px',
        fontWeight: 500,
        ...tagStyle[variant],
        ...style,
      }}
      {...props}
    />
  );
}
