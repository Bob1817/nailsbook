import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkCard, { splitWorksIntoColumns } from '../components/WorkCard';
import { worksService, type NailWork } from '../services/works';

const CATEGORIES = ['全部', '法式', '渐变', '日系', 'ins风', '简约', '可爱', '水晶', '炫彩'];

const Discover: React.FC = () => {
  const navigate = useNavigate();
  const [works, setWorks] = useState<NailWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await worksService.getWorks(undefined, 'latest', 'desc');
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

  const filteredWorks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return works.filter((w) => {
      const categoryMatch =
        activeCategory === '全部' ||
        w.tags.some((t) => t.includes(activeCategory) || activeCategory.includes(t));
      if (!categoryMatch) return false;
      if (!keyword) return true;
      return [
        w.title || '',
        w.technicianName || '',
        ...w.tags,
      ].some((value) => value.toLowerCase().includes(keyword));
    });
  }, [works, activeCategory, searchQuery]);

  const columns = useMemo(() => {
    return splitWorksIntoColumns(filteredWorks);
  }, [filteredWorks]);

  const handleToggleLike = async (e: React.MouseEvent, work: NailWork) => {
    e.stopPropagation();
    const nextLiked = !work.isLiked;
    setWorks((prev) =>
      prev.map((w) =>
        w.id === work.id
          ? { ...w, isLiked: nextLiked, likeCount: Math.max(0, w.likeCount + (nextLiked ? 1 : -1)) }
          : w,
      ),
    );
    try {
      await worksService.likeWork(work.id);
    } catch {
      // 回滚
      setWorks((prev) =>
        prev.map((w) =>
          w.id === work.id
            ? { ...w, isLiked: !nextLiked, likeCount: Math.max(0, w.likeCount + (nextLiked ? -1 : 1)) }
            : w,
        ),
      );
    }
  };

  return (
    <div className="min-h-full bg-[var(--nb-page)] pb-6">
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/88 px-5 app-header-safe pb-2 backdrop-blur-md">
        <div className="flex min-h-11 items-center justify-between">
          <h1 className="text-[17px] font-semibold text-[var(--color-text)]">发现</h1>
        <button
            type="button"
            onClick={() => setShowSearch(true)}
            aria-label="搜索作品"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-text-secondary)] shadow-sm ring-1 ring-black/5 active:scale-95"
        >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        </div>

        {/* 分类 pills */}
        <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--nb-action)] text-white shadow-[0_4px_16px_rgba(0,0,0,0.28)]'
                    : 'bg-[var(--nb-page)] text-[var(--nb-secondary)]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {showSearch && (
        <div
          className="fixed inset-0 z-[120] bg-black/45 px-5 pt-[max(1.5rem,calc(env(safe-area-inset-top)+1rem))] backdrop-blur-sm"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="mx-auto flex max-w-md items-center gap-2 rounded-[24px] bg-white p-2 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="ml-2 h-5 w-5 shrink-0 text-[var(--nb-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索美甲风格、美甲师"
              className="floating-search-input h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--nb-ink)] outline-none placeholder:text-[var(--nb-muted)] focus-visible:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="清空搜索"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] text-[var(--nb-secondary)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSearch(false)}
              className="h-9 rounded-full px-3 text-sm font-medium text-[var(--color-primary)]"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* 内容区 */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          </div>
        ) : works.length === 0 ? (
          /* 空状态：无任何作品 → 引导绑定美甲师 */
          <div className="flex flex-col items-center gap-4 px-8 py-16 text-center">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-[var(--nb-page)]" />
              <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--nb-action)] opacity-60" />
            </div>
            <p className="text-lg font-bold text-[var(--color-text)]">还没有作品可以刷</p>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              绑定你的专属美甲师，即可在这里刷她发布的最新美甲作品，种草、预约一步到位
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-2 rounded-full bg-[var(--nb-action)] px-12 py-3 text-base font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.30)] active:opacity-85"
            >
              绑定美甲师
            </button>
          </div>
        ) : filteredWorks.length === 0 ? (
          /* 空状态：当前风格无作品 */
          <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
            <p className="text-lg font-bold text-[var(--color-text)]">该风格暂无作品</p>
            <p className="text-sm text-[var(--color-text-muted)]">你的美甲师还没有发布此风格的作品</p>
          </div>
        ) : (
          /* 瀑布流 */
          <div className="flex gap-3">
            {columns.map((column, colIndex) => (
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

export default Discover;
