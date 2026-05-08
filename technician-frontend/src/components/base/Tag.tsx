import React from 'react';

type TagVariant = 'primary' | 'success' | 'warning' | 'neutral';

const tagStyle: Record<TagVariant, React.CSSProperties> = {
  primary: { background: '#FFE8EA', color: '#FF5A66' },
  success: { background: '#E8F8F0', color: '#36C275' },
  warning: { background: '#FFF4E5', color: '#FF9F43' },
  neutral: { background: '#F5F5F5', color: '#666666' },
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
