import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { worksService, type NailWork } from '../services/works';

const WorksPage: React.FC = () => {
  const navigate = useNavigate();
  const [works, setWorks] = useState<NailWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechnician, setSelectedTechnician] = useState('全部');

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await worksService.getWorks();
      setWorks(data);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  const getMasonryLayout = () => {
    const columns: NailWork[][] = [[], []];
    filteredWorks.forEach((work, index) => {
      columns[index % 2].push(work);
    });
    return columns;
  };

  const getCardAspect = (index: number) => {
    const patterns = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[5/6]', 'aspect-[3/4]'];
    return patterns[index % patterns.length];
  };

  const technicianFilters = ['全部', ...Array.from(new Set(works.map((work) => work.technicianName).filter(Boolean)))];

  const filteredWorks =
    selectedTechnician === '全部'
      ? works
      : works.filter((work) => work.technicianName === selectedTechnician);

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f6f7fb_28%,#f5f6f8_100%)] pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/88 px-5 app-header-safe pb-4 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/home')}
            className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-soft)] active:scale-[0.97]"
          >
            <svg className="h-5 w-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text)]">作品</h1>
              {!loading && filteredWorks.length > 0 && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] shadow-sm ring-1 ring-black/5">
                  {filteredWorks.length} 条动态
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              浏览你已绑定美甲师发布的作品动态与近期灵感
            </p>
          </div>
        </div>
      </div>

      {/* Masonry Photo Wall */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          </div>
        ) : works.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <div className="mb-4 text-4xl">🎨</div>
            <p className="text-[var(--color-text-muted)]">暂无作品</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">你绑定的美甲师暂时还没有发布作品</p>
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">最新动态</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">来自你已绑定美甲师的作品发布</p>
            </div>
            <div className="rounded-full bg-white/80 px-3 py-1 text-xs text-[var(--color-text-secondary)] ring-1 ring-black/5 backdrop-blur">
              多美甲师聚合
            </div>
          </div>
        )}

        {!loading && works.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto px-1 scrollbar-hide">
            {technicianFilters.map((technicianName) => {
              const active = selectedTechnician === technicianName;
              return (
                <button
                  key={technicianName}
                  onClick={() => setSelectedTechnician(technicianName)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'bg-white text-[var(--color-text-secondary)] ring-1 ring-black/5'
                  }`}
                >
                  {technicianName}
                </button>
              );
            })}
          </div>
        )}

        {!loading && works.length > 0 && filteredWorks.length === 0 && (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="text-[var(--color-text-muted)]">当前筛选下暂无作品动态</p>
          </div>
        )}

        {!loading && filteredWorks.length > 0 && (
          <div className="flex gap-3">
            {getMasonryLayout().map((column, colIndex) => (
              <div key={colIndex} className="flex flex-1 flex-col gap-3">
                {column.map((work, workIndex) => (
                  <div
                    key={work.id}
                    onClick={() => navigate(`/works/${work.id}`)}
                    className={`group relative overflow-hidden rounded-[24px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-black/5 cursor-pointer active:scale-[0.985] transition-transform ${getCardAspect(workIndex + colIndex)}`}
                  >
                    {/* Image */}
                    {work.coverUrl || work.imageUrls?.[0] ? (
                      <img
                        src={work.coverUrl || work.imageUrls[0]}
                        alt={work.title || '作品'}
                        className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full min-h-[9rem] w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                        暂无图片
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent" />

                    {/* Card meta */}
                    <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2 rounded-full bg-black/24 px-2 py-1.5 backdrop-blur-md ring-1 ring-white/10">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/18 text-[11px] font-semibold text-white">
                          {work.technicianName?.slice(0, 1) || '美'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium text-white">{work.technicianName}</p>
                          <p className="text-[9px] text-white/58">发布了新作品</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-black/24 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                        </svg>
                        {work.likeCount || 0}
                      </span>
                    </div>

                    {/* Info overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="truncate text-base font-semibold tracking-[-0.02em] text-white">
                        {work.title || '未命名作品'}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-white/78">来自 {work.technicianName}</span>
                        <span className="text-[11px] text-white/72">
                          {work.commentCount || 0} 条评论
                        </span>
                      </div>
                      {work.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {work.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/18 px-2 py-0.5 text-[10px] text-white/92 backdrop-blur-md"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-white/52">
                          {new Date(work.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-white/78">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707a1 1 0 00-1.414 0L10 11.586 8.707 10.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                          查看详情
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorksPage;
