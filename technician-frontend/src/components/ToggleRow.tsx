import React from 'react';

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  last?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange, last }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors active:bg-[var(--nb-page)] ${
      last ? '' : 'border-b border-[var(--nb-line)]'
    }`}
  >
    <div className="min-w-0">
      <p className="text-[15px] text-[var(--nb-ink)]">{label}</p>
      {description && <p className="mt-0.5 text-xs leading-5 text-[var(--nb-muted)]">{description}</p>}
    </div>
    <span
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-[var(--nb-action)]' : 'bg-[var(--nb-page)]'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-all ${
          checked ? 'left-[1.15rem]' : 'left-0.5'
        }`}
      />
    </span>
  </button>
);
