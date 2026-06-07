import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { worksService, type NailWork } from '../services/works';
import { useToast } from '../components/ToastProvider';

const CATEGORIES = ['全部', '法式', '渐变', '日系', 'ins风', '简约', '可爱', '水晶', '炫彩'];

const ASPECT_PATTERNS = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-[5/6]', 'aspect-[2/3]'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

const Discover: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [works, setWorks] = useState<NailWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('全部');

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
    if (activeCategory === '全部') return works;
    return works.filter((w) =>
      w.tags.some((t) => t.includes(activeCategory) || activeCategory.includes(t)),
    );
  }, [works, activeCategory]);

  const columns = useMemo(() => {
    const cols: NailWork[][] = [[], []];
    filteredWorks.forEach((work, index) => {
      cols[index % 2].push(work);
    });
    return cols;
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
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f6f7fb_28%,#f5f6f8_100%)] pb-6">
      {/* 头部：标题 + 搜索栏 + 分类 pills（sticky） */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/88 px-5 app-header-safe pb-3 backdrop-blur-md">
        <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text)]">发现</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">刷一刷你绑定美甲师发布的最新作品</p>

        {/* 搜索栏 */}
        <button
          onClick={() => toast.info('搜索功能开发中')}
          className="mt-3 flex w-full items-center gap-2.5 rounded-full bg-[#f5f6fa] px-4 py-2.5 text-left active:opacity-80"
        >
          <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm text-gray-400">搜索美甲风格、美甲师…</span>
        </button>

        {/* 分类 pills */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[linear-gradient(135deg,#FF6B8A_0%,#A78BFA_100%)] text-white shadow-[0_4px_16px_rgba(255,107,138,0.28)]'
                    : 'bg-[#f5f6fa] text-gray-500'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

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
              <div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#FFE2EA,#EDE9FE)]" />
              <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(135deg,#FF6B8A,#A78BFA)] opacity-60" />
            </div>
            <p className="text-lg font-bold text-[var(--color-text)]">还没有作品可以刷</p>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              绑定你的专属美甲师，即可在这里刷她发布的最新美甲作品，种草、预约一步到位
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-2 rounded-full bg-[linear-gradient(135deg,#FF6B8A_0%,#A78BFA_100%)] px-12 py-3 text-base font-semibold text-white shadow-[0_8px_24px_rgba(255,107,138,0.30)] active:opacity-85"
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
                  <div
                    key={work.id}
                    onClick={() => navigate(`/works/${work.id}`)}
                    className={`group relative overflow-hidden rounded-[20px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-black/5 cursor-pointer active:scale-[0.985] transition-transform ${ASPECT_PATTERNS[(workIndex * 2 + colIndex) % ASPECT_PATTERNS.length]}`}
                  >
                    {/* 图片 */}
                    {work.coverUrl || work.imageUrls?.[0] ? (
                      <img
                        src={work.coverUrl || work.imageUrls[0]}
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

                    {/* 顶部：美甲师 pill + 点赞 */}
                    <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-black/32 px-2 py-1 backdrop-blur-md">
                        {work.technicianAvatarUrl ? (
                          <img src={work.technicianAvatarUrl} alt="" className="h-[18px] w-[18px] shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
                            {work.technicianName?.slice(0, 1) || '美'}
                          </span>
                        )}
                        <span className="truncate text-[11px] font-medium text-white">{work.technicianName}</span>
                      </div>
                      <button
                        onClick={(e) => handleToggleLike(e, work)}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-black/32 px-2 py-1 backdrop-blur-md active:opacity-75"
                      >
                        <svg className={`h-3.5 w-3.5 ${work.isLiked ? 'text-[#FF6B8A]' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                        </svg>
                        <span className="text-[11px] font-medium text-white">{work.likeCount || 0}</span>
                      </button>
                    </div>

                    {/* 底部：标题 + 标签 + 日期 + 查看详情 */}
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
