import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SubHeaderProps {
  title: string;
}

const SubHeader: React.FC<SubHeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  return (
    <div className="shrink-0 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="返回"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
    </div>
  );
};

export default SubHeader;
