import React, { useState } from 'react';

export interface ArtistCardWork {
  id: number;
  title: string | null;
  coverUrl: string | null;
  imageUrls: string[];
}

export interface ArtistQualification {
  id: number;
  type: string;
  title: string;
  detail: string;
  organization?: string;
  year: number;
  month?: number;
  imageUrl?: string | null;
  isVerified: boolean;
}

export interface ArtistStats {
  followerCount: number;
  likeCount: number;
  favoriteCount: number;
  workCount: number;
  rating: number | null;
  reviewCount: number;
}

export interface FeaturedReview {
  id: number;
  content: string;
  rating: number;
  client: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

interface ArtistCardViewProps {
  name: string;
  avatarUrl: string | null;
  coverImageUrl?: string | null;
  city?: string | null;
  serviceArea?: string | null;
  bio?: string | null;
  servicePhilosophy?: string | null;
  bookingNotes?: string | null;
  styleTags?: string[];
  isVerified?: boolean;
  homeService?: boolean;
  shopService?: boolean;
  status?: string;
  socialMedia?: Record<string, string> | null;
  stats?: ArtistStats;
  qualifications?: ArtistQualification[];
  featuredReviews?: FeaturedReview[];
  works: ArtistCardWork[];
  loadingWorks: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  onShare: () => void;
  onWorkClick: (workId: number) => void;
  onLike?: () => void;
  onFavorite?: () => void;
  onClose?: () => void;
  isLiked?: boolean;
  isFavorited?: boolean;
}

const QUALIFICATION_CONFIG: Record<string, { icon: string; label: string; bgColor: string }> = {
  education: { icon: '🎓', label: '教育经历', bgColor: '#f8f4f6' },
  training: { icon: '📚', label: '培训经历', bgColor: '#f8f4f6' },
  certificate: { icon: '📜', label: '证书资质', bgColor: '#f8f4f6' },
  certification: { icon: '✅', label: '行业认证', bgColor: '#f8f4f6' },
  award: { icon: '🏆', label: '获奖记录', bgColor: '#fff8e1' },
};

const ICON = 'h-4 w-4 shrink-0';

const MapPinIcon = () => (
  <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const HomeIcon = () => (
  <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
  </svg>
);
const StoreIcon = () => (
  <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 9l1-4h14l1 4M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M4 9h16M9 20v-6h6v6" />
  </svg>
);
const ShareIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
  </svg>
);
const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);
const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);
const CalendarIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const VerifiedIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#4fc3f7" aria-hidden>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const formatCount = (count: number): string => {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

const DEFAULT_BIO = '这位美甲师很懒，还没有填写简介~';
const DEFAULT_PHILOSOPHY = '用心做好每一件作品';
const DEFAULT_BOOKING_NOTES = '请提前预约，以便为您安排最佳服务时间';

const ArtistCardView: React.FC<ArtistCardViewProps> = ({
  name,
  avatarUrl,
  coverImageUrl,
  city,
  serviceArea,
  bio,
  servicePhilosophy,
  bookingNotes,
  styleTags,
  isVerified,
  homeService,
  shopService,
  status,
  stats,
  qualifications,
  featuredReviews,
  works,
  loadingWorks,
  primaryLabel,
  onPrimary,
  onShare,
  onWorkClick,
  onLike,
  onFavorite,
  onClose,
  isLiked,
  isFavorited,
}) => {
  const isAccepting = status === 'active';
  const displayBio = bio || DEFAULT_BIO;
  const displayPhilosophy = servicePhilosophy || DEFAULT_PHILOSOPHY;
  const displayBookingNotes = bookingNotes || DEFAULT_BOOKING_NOTES;
  const displayStyleTags = styleTags && styleTags.length > 0 ? styleTags : ['待设置'];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* Cover Image Area */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: '280px' }}>
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="封面图" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, #2d1b3d 0%, #1a1a2e 50%, #16213e 100%)' }}>
            <div className="absolute top-5 right-5 h-20 w-20 rounded-full border border-white/10" />
            <div className="absolute top-10 right-10 h-10 w-10 rounded-full border border-white/10" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }} />
        
        {/* Close button */}
        {onClose && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onClose(); }}
            aria-label="关闭"
            className="absolute right-4 top-[max(1.1rem,env(safe-area-inset-top))] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition-colors duration-200 active:bg-black/50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Avatar and basic info */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-end gap-4">
            <div className="flex h-22 w-22 shrink-0 items-center justify-center overflow-hidden rounded-full border-3 border-white bg-gradient-to-br from-pink-200 to-pink-300 shadow-lg" style={{ width: '88px', height: '88px' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${name}的头像`} className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-pink-700">{name.slice(0, 1)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="truncate text-xl font-semibold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                  {name}
                </h1>
                {isVerified && <VerifiedIcon />}
              </div>
              <p className="text-sm text-white/90 mb-2">
                {city || '专业美甲师'} · {isAccepting ? '可预约' : '休息中'}
              </p>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isAccepting ? 'bg-green-400 animate-pulse' : 'bg-white/50'}`} />
                <span className="text-xs text-white/80">{isAccepting ? '可预约' : '休息中'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Professional Tags */}
        {displayStyleTags.length > 0 && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {displayStyleTags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-gray-800 text-white text-xs rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-0 text-center py-5 border-b border-gray-100">
          <div className="py-2">
            <div className="text-lg font-semibold text-gray-900">{formatCount(stats?.followerCount || 0)}</div>
            <div className="text-xs text-gray-500 mt-1">关注</div>
          </div>
          <div className="py-2 border-l border-r border-gray-100">
            <div className="text-lg font-semibold text-gray-900">{formatCount(stats?.likeCount || 0)}</div>
            <div className="text-xs text-gray-500 mt-1">点赞</div>
          </div>
          <div className="py-2 border-r border-gray-100">
            <div className="text-lg font-semibold text-gray-900">{formatCount(stats?.favoriteCount || 0)}</div>
            <div className="text-xs text-gray-500 mt-1">收藏</div>
          </div>
          <div className="py-2">
            <div className="text-lg font-semibold text-pink-500">{stats?.rating || '暂无'}</div>
            <div className="text-xs text-gray-500 mt-1">评分</div>
          </div>
        </div>

        {/* About Me */}
        <div className="px-5 py-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">关于我</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{displayBio}</p>
        </div>

        {/* Service Info */}
        <div className="px-5 py-5 bg-gray-50 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">服务信息</h3>
          
          <div className="flex gap-3 mb-4">
            {homeService && (
              <div className="flex-1 p-3 bg-white rounded-lg text-center border border-gray-100">
                <HomeIcon />
                <div className="text-xs text-gray-600 mt-1">可上门</div>
              </div>
            )}
            {shopService && (
              <div className="flex-1 p-3 bg-white rounded-lg text-center border border-gray-100">
                <StoreIcon />
                <div className="text-xs text-gray-600 mt-1">可到店</div>
              </div>
            )}
          </div>

          {serviceArea && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">服务范围</div>
              <div className="text-sm text-gray-700">{serviceArea}</div>
            </div>
          )}

          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">服务理念</div>
            <div className="text-sm text-gray-700 italic">"{displayPhilosophy}"</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">预约说明</div>
            <div className="text-sm text-gray-700">{displayBookingNotes}</div>
          </div>
        </div>

        {/* Qualifications */}
        {qualifications && qualifications.length > 0 && (
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">专业资质</h3>
              <span className="text-xs text-gray-500">全部 →</span>
            </div>
            <div className="space-y-4">
              {qualifications.slice(0, 3).map((qual) => {
                const config = QUALIFICATION_CONFIG[qual.type] || QUALIFICATION_CONFIG.education;
                return (
                  <div key={qual.id} className="flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: config.bgColor }}>
                      <span className="text-lg">{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{qual.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{qual.detail} · {qual.year}</div>
                    </div>
                    {qual.isVerified && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Featured Works */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">精选作品</h3>
            <span className="text-xs text-pink-500 font-medium">查看全部 →</span>
          </div>
          {loadingWorks ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : works.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {works.slice(0, 3).map((work) => (
                <button
                  key={work.id}
                  type="button"
                  onClick={() => onWorkClick(work.id)}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                >
                  {work.coverUrl || work.imageUrls?.[0] ? (
                    <img src={work.coverUrl || work.imageUrls[0]} alt={work.title || '作品'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">暂无作品</div>
          )}
        </div>

        {/* Customer Reviews */}
        <div className="px-5 py-5 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">客户评价</h3>
            <span className="text-xs text-gray-500">{stats?.reviewCount || 0}条评价</span>
          </div>
          {featuredReviews && featuredReviews.length > 0 ? (
            <div className="space-y-3">
              {featuredReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-100">
                      {review.client.avatarUrl ? (
                        <img src={review.client.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-medium text-pink-500">
                          {review.client.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-medium text-gray-900 truncate">{review.client.name}</p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <svg key={i} className={`h-3 w-3 ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-600 leading-relaxed">{review.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">暂无评价</div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onShare}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors active:bg-gray-200"
            aria-label="分享"
          >
            <ShareIcon />
          </button>
          <button
            type="button"
            onClick={onLike}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isLiked ? 'bg-pink-100 text-pink-500' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
            aria-label="点赞"
          >
            <HeartIcon filled={isLiked} />
          </button>
          <button
            type="button"
            onClick={onFavorite}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isFavorited ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
            aria-label="收藏"
          >
            <BookmarkIcon filled={isFavorited} />
          </button>
          <button
            type="button"
            onClick={onPrimary}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-gray-900 text-sm font-semibold text-white shadow-sm transition-colors active:bg-gray-800"
          >
            <CalendarIcon />
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistCardView;
