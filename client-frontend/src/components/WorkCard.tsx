import React from 'react';

export interface WorkCardWork {
  id: number;
  title: string | null;
  coverUrl: string | null;
  imageUrls: string[];
  tags: string[];
  likeCount: number;
  isLiked?: boolean;
  technicianName: string;
  technicianAvatarUrl?: string | null;
  createdAt: string;
}

interface WorkCardProps {
  work: WorkCardWork;
  variantIndex: number;
  onOpen: (work: WorkCardWork) => void;
  onToggleLike?: (event: React.MouseEvent, work: WorkCardWork) => void;
}

const ASPECT_PATTERNS = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-[5/6]', 'aspect-[2/3]'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function splitWorksIntoColumns<T>(works: T[]): T[][] {
  const columns: T[][] = [[], []];
  works.forEach((work, index) => {
    columns[index % 2].push(work);
  });
  return columns;
}

const WorkCard: React.FC<WorkCardProps> = ({ work, variantIndex, onOpen, onToggleLike }) => {
  const imageUrl = work.coverUrl || work.imageUrls?.[0];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(work);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(work)}
      onKeyDown={handleKeyDown}
      className={`group relative cursor-pointer overflow-hidden rounded-[20px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-black/5 transition-transform active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${ASPECT_PATTERNS[variantIndex % ASPECT_PATTERNS.length]}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={work.title || '作品'}
          className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.02]"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full min-h-[9rem] w-full items-center justify-center bg-[linear-gradient(135deg,#f1e8f0,#e8eaf6)] text-sm text-gray-400">
          暂无图片
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/12 to-black/25" />

      <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-black/32 px-2 py-1 backdrop-blur-md">
          {work.technicianAvatarUrl ? (
            <img
              src={work.technicianAvatarUrl}
              alt=""
              className="h-[18px] w-[18px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
              {work.technicianName?.slice(0, 1) || '美'}
            </span>
          )}
          <span className="truncate text-[11px] font-medium text-white">{work.technicianName}</span>
        </div>

        <button
          type="button"
          onClick={(event) => onToggleLike?.(event, work)}
          disabled={!onToggleLike}
          aria-label={work.isLiked ? '取消点赞' : '点赞作品'}
          className="flex min-h-11 shrink-0 items-center justify-center gap-1 px-1 text-white transition-opacity active:opacity-75 disabled:cursor-default disabled:opacity-100"
        >
          <svg className={`h-3.5 w-3.5 ${work.isLiked ? 'text-[#FF6B8A]' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
          </svg>
          <span className="text-[11px] font-medium text-white">{work.likeCount || 0}</span>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="truncate text-sm font-semibold tracking-[-0.02em] text-white">
          {work.title || '美甲作品'}
        </p>
        {work.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 overflow-hidden">
            {work.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/16 px-2 py-0.5 text-[10px] text-white/92 backdrop-blur-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-white/52">{formatDate(work.createdAt)}</span>
          <span className="flex items-center gap-1 text-[10px] text-white/78">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707a1 1 0 00-1.414 0L10 11.586 8.707 10.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
            查看详情
          </span>
        </div>
      </div>
    </div>
  );
};

export default WorkCard;
