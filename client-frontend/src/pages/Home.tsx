import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { homeService, type HomeData } from '../services/home';
import { TripCardSkeleton, Skeleton } from '../components/Skeleton';
import dayjs from 'dayjs';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const loadHomeData = useCallback(async () => {
    try {
      const data = await homeService.getHome();
      setHomeData(data);
    } catch (err) {
      console.error('Failed to load home data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const formatDate = (value: string | null | undefined, pattern: string, fallback = '--') => {
    if (!value) {
      return fallback;
    }

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format(pattern) : fallback;
  };

  // Demo carousel images from free image CDN
  const demoCarouselImages = [
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80',
      title: '法式优雅美甲',
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80',
      title: '渐变粉色美甲',
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80',
      title: '精致花朵美甲',
    },
    {
      id: 4,
      url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80',
      title: '时尚几何美甲',
    },
    {
      id: 5,
      url: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&q=80',
      title: '闪亮星空美甲',
    },
  ];

  const heroImages = homeData?.works && homeData.works.length > 0
    ? homeData.works.slice(0, 5).map((work) => ({
        id: work.id,
        url: work.coverUrl || work.imageUrls[0] || demoCarouselImages[0].url,
        title: work.title || '最新作品',
        technicianName: work.technicianName,
      }))
    : demoCarouselImages.map((image) => ({
        ...image,
        technicianName: homeData?.technician?.name || '已绑定美甲师',
      }));

  const uniqueTechnicianNames = Array.from(
    new Set((homeData?.works || []).map((work) => work.technicianName).filter(Boolean)),
  );
  const boundTechnicianCount = Math.max(
    uniqueTechnicianNames.length,
    homeData?.technician?.name ? 1 : 0,
  );

  // Auto-play carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  if (loading) {
    return (
      <div className="min-h-full bg-[var(--color-bg)] pb-24">
        <div className="sticky top-0 z-20 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">NailArt</p>
              <h1 className="mt-0.5 text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text)]">首页</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
                <Skeleton variant="circular" width="20px" height="20px" />
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
                <Skeleton variant="circular" width="20px" height="20px" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 pt-4 space-y-4">
          <Skeleton variant="rectangular" className="h-[25rem] rounded-[32px]" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="rectangular" className="aspect-[3/4] rounded-[24px]" />
            <Skeleton variant="rectangular" className="aspect-[4/5] rounded-[24px]" />
          </div>
          <div className="rounded-[28px] bg-white px-4 py-5 shadow-sm ring-1 ring-black/5">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton variant="rectangular" width="52px" height="52px" className="rounded-2xl" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
          <TripCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff8fa_0%,#f8f9fc_24%,#f5f6f8_100%)] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">NailArt</p>
            <h1 className="mt-0.5 text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--color-text)]">首页</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/chat')}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 active:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5 active:bg-slate-50 transition-colors"
            >
              {homeData?.technician?.avatarUrl ? (
                <img src={homeData.technician.avatarUrl} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="px-5 pt-4">
        <div className="relative overflow-hidden rounded-[32px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.1)] ring-1 ring-black/5">
          <div className="relative h-[25rem] overflow-hidden">
          {heroImages.map((image, index) => (
            <div
              key={image.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image.url}
                alt={image.title}
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,20,0.08)_0%,rgba(7,10,20,0.18)_22%,rgba(7,10,20,0.5)_68%,rgba(7,10,20,0.82)_100%)]"></div>
              <div className="absolute left-5 right-5 top-5 flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md ring-1 ring-white/20">
                    多美甲师动态
                  </span>
                  <span className="rounded-full bg-black/24 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md ring-1 ring-white/10">
                    {boundTechnicianCount} 位美甲师
                  </span>
                </div>
                <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                  {currentSlide + 1}/{heroImages.length}
                </span>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-[11px] tracking-[0.12em] text-white/68">已绑定美甲师正在持续发布新作品</p>
                <h2 className="mt-2 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.03em] text-white">
                  今日值得看的美甲灵感
                </h2>
                <p className="mt-2 line-clamp-1 text-sm text-white/76">
                  来自你已绑定美甲师的最新作品、风格更新与近期热门款式
                </p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0 rounded-2xl bg-black/22 px-3.5 py-3 backdrop-blur-md ring-1 ring-white/10">
                    <p className="truncate text-base font-medium text-white">{image.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-white/74">
                      <span>{image.technicianName}</span>
                      <span className="text-white/35">·</span>
                      <span>最新发布</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/works')}
                    className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-text)] shadow-sm active:scale-[0.98]"
                  >
                    查看动态
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>

          <div className="absolute bottom-24 left-5 flex items-center gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-6 bg-white'
                  : 'w-1.5 bg-white/60'
              }`}
              aria-label={`切换到第${index + 1}张图片`}
            />
          ))}
          </div>
        </div>
      </div>

      {/* Latest Works */}
      <div className="px-5 mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-heading-3 text-[var(--color-text)]">最新动态</h2>
            <p className="mt-1 text-caption text-[var(--color-text-muted)]">来自你已绑定美甲师的作品发布</p>
          </div>
          <button
            onClick={() => navigate('/works')}
            className="text-body-sm text-[var(--color-primary)] font-medium flex items-center gap-0.5"
          >
            查看全部
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {homeData?.works && homeData.works.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {homeData.works.slice(0, 4).map((work, index) => (
              <div
                key={work.id}
                onClick={() => navigate(`/works/${work.id}`)}
                className={`group relative overflow-hidden rounded-[24px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 cursor-pointer active:scale-[0.985] transition-transform ${
                  index % 3 === 0 ? 'aspect-[3/4]' : 'aspect-[4/5]'
                }`}
              >
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
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
                  <span className="rounded-full bg-black/24 px-2.5 py-1 text-[10px] text-white backdrop-blur-md">
                    {work.commentCount || 0} 评论
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{work.title || '未命名作品'}</p>
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
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/76">
                    <span>来自 {work.technicianName}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                      {work.likeCount || 0}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-white/52">{formatDate(work.createdAt, 'MM/DD')}</span>
                    <span className="text-[10px] text-white/72">查看详情</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-body-sm text-[var(--color-text-muted)]">暂无作品展示</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-5 mt-6">
        <div className="rounded-[28px] bg-white px-4 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-heading-3 text-[var(--color-text)]">服务入口</h2>
              <p className="mt-1 text-caption text-[var(--color-text-muted)]">快速发起预约、设计与沟通</p>
            </div>
          </div>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/orders/create')}
            className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FF6B8A] to-[#FF8FA3] flex items-center justify-center shadow-lg shadow-pink-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-caption font-medium text-[var(--color-text)]">预约服务</span>
          </button>
          <button
            onClick={() => navigate('/designs/create')}
            className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FF6B8A] to-[#FF8FA3] flex items-center justify-center shadow-lg shadow-pink-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-caption font-medium text-[var(--color-text)]">发起设计</span>
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FF6B8A] to-[#FF8FA3] flex items-center justify-center shadow-lg shadow-pink-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-caption font-medium text-[var(--color-text)]">查看预约</span>
          </button>
          <button
            onClick={() => navigate('/chat')}
            className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FF6B8A] to-[#FF8FA3] flex items-center justify-center shadow-lg shadow-pink-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-caption font-medium text-[var(--color-text)]">联系美甲师</span>
          </button>
        </div>
        </div>
      </div>

    </div>
  );
};

export default Home;
