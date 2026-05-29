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
    className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors active:bg-[#fff7fa] ${
      last ? '' : 'border-b border-[#f6eef2]'
    }`}
  >
    <div className="min-w-0">
      <p className="text-[15px] text-[#3c3440]">{label}</p>
      {description && <p className="mt-0.5 text-xs leading-5 text-[#a89ba3]">{description}</p>}
    </div>
    <span
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#FF5E93]' : 'bg-[#e2d8de]'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(29,35,53,0.18)] transition-all ${
          checked ? 'left-[1.15rem]' : 'left-0.5'
        }`}
      />
    </span>
  </button>
);
