import React from 'react';

interface AppPageProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppPage({ title, subtitle, actions, children, className = '', ...props }: AppPageProps) {
  return (
    <main
      className={`min-h-full bg-page px-lg pb-24 pt-xl font-sans text-text-primary ${className}`.trim()}
      {...props}
    >
      <header className="mb-lg flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-title-lg font-semibold leading-title text-text-primary">{title}</h1>
          {subtitle ? <p className="mt-xs text-body text-text-secondary">{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-sm">
            {actions}
          </div>
        ) : null}
      </header>
      <div className="space-y-lg">
        {children}
      </div>
    </main>
  );
}
