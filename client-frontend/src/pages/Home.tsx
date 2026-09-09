import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { homeService, type HomeData, type NailWork } from '../services/home';
import { worksService } from '../services/works';
import { orderService, type Order } from '../services/order';
import { TripCardSkeleton, Skeleton } from '../components/Skeleton';
import WorkCard, { splitWorksIntoColumns } from '../components/WorkCard';
import OrderDetail from './OrderDetail';
import dayjs from 'dayjs';

const STATUS_LABELS: Record<string, string> = {
  pending_quote: '待报价',
  pending_agree: '待同意',
  pending_confirm: '待确认',
  pending_home: '待上门',
  pending_shop: '待到店',
  in_progress: '服务中',
};

const UPCOMING_STATUSES = new Set([
  'pending_quote',
  'pending_agree',
  'pending_confirm',
  'pending_home',
  'pending_shop',
  'in_progress',
]);

function formatCountdown(target: string): string {
  const diff = dayjs(target).diff(dayjs(), 'minute');
  if (diff <= 0) return '已开始';
  const days = Math.floor(diff / (60 * 24));
  const hours = Math.floor((diff % (60 * 24)) / 60);
  const minutes = diff % 60;
  if (days >= 1) return `${days} 天 ${hours} 小时`;
  if (hours >= 1) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分钟`;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [upcomingOrder, setUpcomingOrder] = useState<Order | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setNow] = useState(() => Date.now());
  // 最新动态：所有已绑定美甲师的推荐作品，无限上拉
  const [featuredWorks, setFeaturedWorks] = useState<NailWork[]>([]);
  const [featPage, setFeatPage] = useState(1);
  const [featHasMore, setFeatHasMore] = useState(true);
  const [featLoading, setFeatLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadFeatured = useCallback(async (page: number) => {
    setFeatLoading(true);
    try {
      const res = await homeService.getFeaturedWorks(page, 10);
      setFeaturedWorks((prev) => (page === 1 ? res.works : [...prev, ...res.works]));
      setFeatHasMore(res.hasMore);
      setFeatPage(page);
    } catch (err) {
      console.error('Failed to load featured works', err);
      setFeatHasMore(false);
    } finally {
      setFeatLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatured(1);
  }, [loadFeatured]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && featHasMore && !featLoading) {
          loadFeatured(featPage + 1);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [featHasMore, featLoading, featPage, loadFeatured]);

  const loadHomeData = useCallback(async () => {
    try {
      const [data, orders] = await Promise.all([
        homeService.getHome(),
        orderService.getOrders().catch(() => [] as Order[]),
      ]);
      setHomeData(data);

      const upcoming = orders
        .filter((o) => UPCOMING_STATUSES.has(o.status))
        .filter((o) => o.startTime)
        .sort((a, b) => dayjs(a.startTime).diff(dayjs(b.startTime)))[0];
      setUpcomingOrder(upcoming || null);
    } catch (err) {
      console.error('Failed to load home data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 倒计时每分钟更新
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const handleToggleFeaturedLike = async (event: React.MouseEvent, work: NailWork) => {
    event.stopPropagation();
    const nextLiked = !work.isLiked;
    setFeaturedWorks((prev) =>
      prev.map((item) =>
        item.id === work.id
          ? { ...item, isLiked: nextLiked, likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)) }
          : item,
      ),
    );
    try {
      await worksService.likeWork(work.id);
    } catch {
      setFeaturedWorks((prev) =>
        prev.map((item) =>
          item.id === work.id
            ? { ...item, isLiked: !nextLiked, likeCount: Math.max(0, item.likeCount + (nextLiked ? -1 : 1)) }
            : item,
        ),
      );
    }
  };

  const formatDate = (value: string | null | undefined, pattern: string, fallback = '--') => {
    if (!value) {
      return fallback;
    }

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format(pattern) : fallback;
  };

  // Demo carousel images from free image CDN
  const heroImages = (homeData?.works || []).slice(0, 5).map(work => ({
    id: work.id, url: work.coverUrl || work.imageUrls[0], title: work.title || '推荐作品',
    technicianName: work.technicianName, technicianAvatarUrl: work.technicianAvatarUrl, workId: work.id,
  }));

  // Auto-play carousel
  useEffect(() => {
    setCurrentSlide(0);
    if (heroImages.length < 2) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  if (loading) {
    return (
      <div className="min-h-full bg-[var(--color-bg)] pb-24">
        <div className="space-y-4">
          <Skeleton variant="rectangular" className="h-[clamp(23rem,58dvh,35rem)] rounded-none" />
          <div className="px-5">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="rectangular" className="aspect-[3/4] rounded-[24px]" />
            <Skeleton variant="rectangular" className="aspect-[4/5] rounded-[24px]" />
          </div>
          </div>
          <div className="px-5">
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
          </div>
          <div className="px-5">
          <TripCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--nb-page)] pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden bg-white">
        <div className="relative h-[clamp(23rem,58dvh,35rem)] overflow-hidden">
          {!heroImages.length && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--nb-page)] text-[var(--nb-muted)] text-sm"><p>{homeData?.technician ? '美甲师暂未设置首页推荐' : '绑定美甲师后查看首页推荐'}</p><button className="min-h-11 px-4 text-[var(--nb-link)] rounded-lg active:bg-[var(--nb-pressed)] focus-visible:outline" onClick={() => navigate('/works')}>浏览作品</button></div>}
          {heroImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => navigate(image.workId ? `/works/${image.workId}` : '/works')}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <img
                src={image.url}
                alt={image.title}
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.05)_28%,rgba(0,0,0,0.08)_56%,rgba(0,0,0,0.78)_100%)]"></div>
              <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.75)]">
                    {image.title}
                  </h2>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/24 text-[11px] font-semibold text-white shadow-[0_3px_10px_rgba(0,0,0,0.24)]">
                      {image.technicianAvatarUrl ? (
                        <img src={image.technicianAvatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        image.technicianName?.slice(0, 1) || '美'
                      )}
                    </span>
                    <span className="truncate text-xs font-medium text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
                      {image.technicianName}
                    </span>
                  </div>
                </div>
                <span className="mb-0.5 inline-flex h-9 shrink-0 items-center rounded-full border border-white/25 bg-black/36 px-3 text-xs font-semibold text-white backdrop-blur-md">
                  查看详情
                  <svg className="ml-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
                    </div>

          <div className="absolute left-0 right-0 top-[max(0.75rem,calc(env(safe-area-inset-top)+0.55rem))] flex items-center justify-center gap-1.5">
          {heroImages.length > 1 && heroImages.map((_, index) => (
            <button
              key={index}
              type="button"
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

      {/* My Booking */}
      <div className="px-5 mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-heading-3 text-[var(--color-text)]">我的预约</h2>
            <p className="mt-1 text-caption text-[var(--color-text-muted)]">
              {upcomingOrder ? '距离最近的一次预约' : '快速发起你的下一次美甲'}
            </p>
          </div>
          {upcomingOrder && (
            <button
              onClick={() => navigate('/orders')}
              className="text-body-sm text-[var(--color-primary)] font-medium flex items-center gap-0.5"
            >
              查看全部
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {upcomingOrder ? (
          <div
            onClick={() => setDetailOrderId(upcomingOrder.id)}
            className="relative overflow-hidden rounded-[28px] bg-[var(--nb-action)] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.28)] cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_28%)]" />

            {/* Top row: status + countdown */}
            <div className="relative flex items-center justify-between mb-3">
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md ring-1 ring-white/25">
                {STATUS_LABELS[upcomingOrder.status] || upcomingOrder.status}
              </span>
              <div className="rounded-full bg-black/22 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                <span className="text-white/68">倒计时 </span>
                <span className="text-white">{formatCountdown(upcomingOrder.startTime)}</span>
              </div>
            </div>

            {/* Date + service info */}
            <div className="relative flex items-start gap-4">
              <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-white/22 backdrop-blur-md ring-1 ring-white/25">
                <span className="text-[11px] font-medium text-white/82">
                  {formatDate(upcomingOrder.startTime, 'MM月')}
                </span>
                <span className="text-[1.75rem] font-bold leading-none text-white">
                  {formatDate(upcomingOrder.startTime, 'D')}
                </span>
                <span className="mt-1 text-[10px] text-white/68">
                  {formatDate(upcomingOrder.startTime, 'dddd')}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[1.125rem] font-semibold text-white truncate">
                  {upcomingOrder.serviceType || '美甲服务'}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-white/86">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDate(upcomingOrder.startTime, 'HH:mm')} - {formatDate(upcomingOrder.endTime, 'HH:mm')}
                </div>
                {upcomingOrder.technician && (
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-white/82">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate">{upcomingOrder.technician.name}</span>
                  </div>
                )}
                <div className="mt-1 flex items-start gap-1.5 text-[13px] text-white/82">
                  <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="line-clamp-2">{upcomingOrder.address || '地址待确认'}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="relative mt-4 flex items-center gap-2 pt-4 border-t border-white/18">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/chat');
                }}
                className="flex-1 rounded-full bg-white/18 px-4 py-2.5 text-[13px] font-medium text-white backdrop-blur-md ring-1 ring-white/20 active:scale-[0.97]"
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  发消息
                </span>
              </button>
              {upcomingOrder.technician?.phone && (
                <a
                  href={`tel:${upcomingOrder.technician.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 rounded-full bg-white/18 px-4 py-2.5 text-center text-[13px] font-medium text-white backdrop-blur-md ring-1 ring-white/20 active:scale-[0.97]"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    打电话
                  </span>
                </a>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailOrderId(upcomingOrder.id);
                }}
                className="flex-1 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-[var(--color-primary)] active:scale-[0.97]"
              >
                查看详情
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/orders/create')}
            className="relative overflow-hidden rounded-[28px] bg-white px-5 py-7 shadow-[0_12px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--nb-action)] shadow-lg shadow-black/5">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[1.125rem] font-semibold text-[var(--color-text)]">还没有预约美甲</p>
                <p className="mt-1 text-body-sm text-[var(--color-text-muted)]">预约你的美甲吧 ～</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/orders/create');
                }}
                className="shrink-0 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-black/5 active:scale-[0.97]"
              >
                立即预约
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Latest Works */}
      <div className="px-5 mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-heading-3 text-[var(--color-text)]">热门推荐</h2>
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

        {featuredWorks.length > 0 ? (
          <>
          <div className="flex gap-3">
            {splitWorksIntoColumns(featuredWorks).map((column, colIndex) => (
              <div key={colIndex} className="flex flex-1 flex-col gap-3">
                {column.map((work, workIndex) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    variantIndex={workIndex * 2 + colIndex}
                    onOpen={(item) => navigate(`/works/${item.id}`)}
                    onToggleLike={(event) => handleToggleFeaturedLike(event, work)}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* 无限上拉哨兵 */}
          <div ref={sentinelRef} className="flex h-12 items-center justify-center">
            {featLoading && (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
            )}
            {!featHasMore && (
              <span className="text-xs text-[var(--color-text-muted)]">没有更多了</span>
            )}
          </div>
          </>
        ) : featLoading ? (
          <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">加载中...</div>
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--nb-page)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--nb-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-body-sm text-[var(--color-text-muted)]">暂无作品展示</p>
          </div>
        )}
      </div>


      {detailOrderId !== null && (
        <OrderDetail
          isModal
          orderIdProp={detailOrderId}
          onClose={() => {
            setDetailOrderId(null);
            loadHomeData();
          }}
        />
      )}
    </div>
  );
};

export default Home;
