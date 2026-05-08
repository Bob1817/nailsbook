import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

const buttonClassName: Record<ButtonVariant, string> = {
  primary:
    'h-12 rounded-button bg-primary px-lg text-title-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,90,102,0.18)] active:bg-primary-hover',
  secondary: 'h-11 rounded-button bg-primary-light px-lg text-body font-medium text-primary',
  outline: 'h-11 rounded-button border border-border bg-white px-lg text-body font-medium text-text-secondary',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className = '', style, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap border-0 ${buttonClassName[variant]} ${className}`.trim()}
      style={style}
      {...props}
    />
  );
}
