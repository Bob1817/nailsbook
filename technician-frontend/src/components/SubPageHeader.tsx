import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SubPageHeaderProps {
  title: string;
}

export const SubPageHeader: React.FC<SubPageHeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  return (
    <div className="shrink-0 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3f5] active:bg-[#eee5e9]"
      >
        <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-[17px] font-semibold text-[#1f2230]">{title}</h1>
    </div>
  );
};
