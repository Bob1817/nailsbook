import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

const buttonClassName: Record<ButtonVariant, string> = {
  primary:
    'h-12 rounded-button bg-primary px-lg text-title-sm font-semibold text-white active:bg-primary-hover',
  secondary: 'h-11 rounded-button bg-primary-light px-lg text-body font-medium text-text-secondary active:bg-[var(--nb-pressed)]',
  outline: 'h-11 rounded-button border border-[var(--nb-control)] bg-white px-lg text-body font-medium text-text-secondary active:bg-[var(--nb-pressed)]',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className = '', style, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nb-link)] disabled:cursor-not-allowed disabled:bg-[var(--nb-pressed)] disabled:text-[var(--nb-control)] ${buttonClassName[variant]} ${className}`.trim()}
      style={style}
      {...props}
    />
  );
}
