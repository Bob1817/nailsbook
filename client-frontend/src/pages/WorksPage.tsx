import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkCard, { splitWorksIntoColumns } from '../components/WorkCard';
import { worksService, type NailWork, type WorksSortBy } from '../services/works';

const SORT_TABS: { key: WorksSortBy; label: string }[] = [
  { key: 'latest', label: '最新' },
  { key: 'likes', label: '点赞' },
  { key: 'comments', label: '评论' },
  { key: 'favorites', label: '收藏' },
];

const WorksPage: React.FC = () => {
  const navigate = useNavigate();
  const [works, setWorks] = useState<NailWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechnician, setSelectedTechnician] = useState('全部');
  const [sortBy, setSortBy] = useState<WorksSortBy>('latest');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await worksService.getWorks(undefined, sortBy, sortDir);
      setWorks(data);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortDir]);

  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  const getMasonryLayout = () => {
    return splitWorksIntoColumns(filteredWorks);
  };

  const technicianFilters = ['全部', ...Array.from(new Set(works.map((work) => work.technicianName).filter(Boolean)))];

  const filteredWorks =
    selectedTechnician === '全部'
      ? works
      : works.filter((work) => work.technicianName === selectedTechnician);

  const handleToggleLike = async (event: React.MouseEvent, work: NailWork) => {
    event.stopPropagation();
    const nextLiked = !work.isLiked;
    setWorks((prev) =>
      prev.map((item) =>
        item.id === work.id
          ? { ...item, isLiked: nextLiked, likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)) }
          : item,
      ),
    );
    try {
      await worksService.likeWork(work.id);
    } catch {
      setWorks((prev) =>
        prev.map((item) =>
          item.id === work.id
            ? { ...item, isLiked: !nextLiked, likeCount: Math.max(0, item.likeCount + (nextLiked ? -1 : 1)) }
            : item,
        ),
      );
    }
  };

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f6f7fb_28%,#f5f6f8_100%)] pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/88 px-5 app-header-safe pb-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            aria-label="返回"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-[0.97]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)]">
              <svg className="h-5 w-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-lg font-semibold text-[var(--color-text)]">作品</h1>
              {!loading && filteredWorks.length > 0 && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] shadow-sm ring-1 ring-black/5">
                  {filteredWorks.length} 条动态
                </span>
              )}
            </div>
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
        ) : null}

        {!loading && works.length > 0 && (
          <div className="mb-3 flex gap-2 px-1">
            {SORT_TABS.map((tab) => {
              const active = sortBy === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    if (sortBy === tab.key) {
                      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
                    } else {
                      setSortBy(tab.key);
                      setSortDir('desc');
                    }
                  }}
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'bg-white text-[var(--color-text-secondary)] ring-1 ring-black/5'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <svg className="ml-1 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </button>
              );
            })}
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
                  <WorkCard
                    key={work.id}
                    work={work}
                    variantIndex={workIndex * 2 + colIndex}
                    onOpen={(item) => navigate(`/works/${item.id}`)}
                    onToggleLike={(event) => handleToggleLike(event, work)}
                  />
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
