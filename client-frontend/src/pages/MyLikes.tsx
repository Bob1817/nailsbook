import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { worksService, type NailWork } from '../services/works';

const MyLikes: React.FC = () => {
  const navigate = useNavigate();
  const [works, setWorks] = useState<NailWork[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLikedWorks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await worksService.getLikes();
      setWorks(data);
    } catch (err) {
      console.error('Failed to load liked works', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLikedWorks();
  }, [loadLikedWorks]);

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f6f7fb_28%,#f5f6f8_100%)] pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/88 px-5 app-header-safe pb-4 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-soft)] active:scale-[0.97]"
          >
            <svg className="h-5 w-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text)]">我的点赞</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              查看你点赞过的美甲作品
            </p>
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
            <div className="mb-4 text-4xl">💗</div>
            <p className="text-[var(--color-text-muted)]">暂无点赞作品</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">去首页发现喜欢的作品并点赞吧</p>
            <button
              onClick={() => navigate('/home')}
              className="mt-4 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white active:scale-95 transition-transform"
            >
              去逛逛
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {works.map((work) => (
              <div
                key={work.id}
                onClick={() => navigate(`/works/${work.id}`)}
                className="group cursor-pointer active:scale-[0.985] transition-transform"
              >
                <div className="relative overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 aspect-[4/5]">
                  {work.coverUrl ? (
                    <img
                      src={work.coverUrl}
                      alt={work.title || '作品'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100">
                      <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="mt-2 px-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[var(--color-text-muted)]">{work.technicianName}</span>
                    <svg className="w-3 h-3 text-[#FF6B8A]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-1">
                    <p className="line-clamp-1 text-sm font-semibold text-[var(--color-text)]">{work.title || '未命名作品'}</p>
                    <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                      <svg className="w-3 h-3 text-[#FF6B8A]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                      {work.likeCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLikes;
