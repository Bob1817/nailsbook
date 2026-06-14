import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkCard, { splitWorksIntoColumns } from '../components/WorkCard';
import { worksService, type NailWork } from '../services/works';

const MyFavorites: React.FC = () => {
  const navigate = useNavigate();
  const [works, setWorks] = useState<NailWork[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavoritedWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await worksService.getFavorites();
      setWorks(data);
    } catch (err) {
      console.error('Failed to load favorited works', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavoritedWorks();
  }, [loadFavoritedWorks]);

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
            onClick={() => navigate('/profile')}
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
            <h1 className="text-lg font-semibold text-[var(--color-text)]">我的收藏</h1>
          </div>
        </div>
      </div>

      {/* Works Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          </div>
        ) : works.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <div className="mb-4 text-4xl">🔖</div>
            <p className="text-[var(--color-text-muted)]">暂无收藏作品</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">去首页发现喜欢的作品并收藏吧</p>
            <button
              onClick={() => navigate('/home')}
              className="mt-4 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white active:scale-95 transition-transform"
            >
              去逛逛
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            {splitWorksIntoColumns(works).map((column, colIndex) => (
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

export default MyFavorites;
