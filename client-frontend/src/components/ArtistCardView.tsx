import React, { useState } from 'react';

export interface ArtistCardWork {
  id: number;
  title: string | null;
  coverUrl: string | null;
  imageUrls: string[];
}

interface ArtistCardViewProps {
  name: string;
  avatarUrl: string | null;
  city?: string | null;
  serviceArea?: string | null;
  homeService?: boolean;
  shopService?: boolean;
  status?: string; // 'active' => 接单中
  socialMedia?: Record<string, string> | null;
  works: ArtistCardWork[];
  loadingWorks: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  onShare: () => void;
  onWorkClick: (workId: number) => void;
  onClose?: () => void;
}

// 品牌色 + 名称（不使用 emoji 作为结构性图标）
const SOCIAL_META: Record<string, { label: string; color: string }> = {
  weibo: { label: '微博', color: '#E6162D' },
  xiaohongshu: { label: '小红书', color: '#FF2442' },
  douyin: { label: '抖音', color: '#161823' },
  kuaishou: { label: '快手', color: '#FF7700' },
  wechat: { label: '微信', color: '#07C160' },
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
  <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.7 13.3l6.6 3.4M15.3 7.3L8.7 10.7M18 8a3 3 0 10-3-3 3 3 0 003 3zm0 11a3 3 0 10-3-3 3 3 0 003 3zM6 15a3 3 0 10-3-3 3 3 0 003 3z" />
  </svg>
);
const CalendarIcon = () => (
  <svg className={ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const CopyIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const ExternalIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ArtistCardView: React.FC<ArtistCardViewProps> = ({
  name,
  avatarUrl,
  city,
  serviceArea,
  homeService,
  shopService,
  status,
  socialMedia,
  works,
  loadingWorks,
  primaryLabel,
  onPrimary,
  onShare,
  onWorkClick,
  onClose,
}) => {
  const isAccepting = status === 'active';
  const socialEntries = Object.entries(socialMedia || {}).filter(
    ([key, value]) => SOCIAL_META[key] && typeof value === 'string' && value.trim(),
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopySocial = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1500);
    } catch {
      /* 复制失败静默处理 */
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#FDF2F8]">
      {/* ===== 头部：基本信息 ===== */}
      <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#FF6B8A_0%,#FF8FB0_52%,#FFC0A6_100%)] px-5 pt-[max(1.1rem,env(safe-area-inset-top))] pb-7">
        <div className="pointer-events-none absolute right-[-12%] top-[-25%] h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        {onClose && (
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-4 top-[max(1.1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors duration-200 active:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="relative flex items-center gap-4 pt-1">
          <div className="flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-[26px] border-2 border-white/55 bg-white/20 shadow-[0_10px_28px_rgba(112,35,71,0.22)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${name}的头像`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{name.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-white [text-shadow:0_1px_4px_rgba(112,35,71,0.28)]">
              {name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {city && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-medium text-white">
                  <MapPinIcon />
                  {city}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isAccepting ? 'bg-emerald-500 text-white' : 'bg-white/25 text-white'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isAccepting ? 'bg-white' : 'bg-white/80'} ${isAccepting ? 'animate-pulse motion-reduce:animate-none' : ''}`} />
                {isAccepting ? '接单中' : '休息中'}
              </span>
            </div>
          </div>
        </div>

        {/* 服务方式 */}
        {(homeService || shopService || serviceArea) && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {homeService && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#E0457B] shadow-[0_4px_12px_rgba(112,35,71,0.12)]">
                <HomeIcon />
                可上门
              </span>
            )}
            {shopService && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#E0457B] shadow-[0_4px_12px_rgba(112,35,71,0.12)]">
                <StoreIcon />
                可到店
              </span>
            )}
            {serviceArea && (
              <span className="inline-flex items-center rounded-full bg-white/25 px-3 py-1.5 text-[12px] font-medium text-white">
                服务范围：{serviceArea}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ===== 内容区 ===== */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {/* 社交媒体 */}
        {socialEntries.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 text-[15px] font-semibold text-[#831843]">社交媒体</h3>
            <div className="flex flex-wrap gap-2">
              {socialEntries.map(([key, value]) => {
                const meta = SOCIAL_META[key];
                const isUrl = /^https?:\/\//i.test(value);
                const base =
                  'inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-[13px] font-medium text-[#831843] shadow-[0_2px_10px_rgba(131,24,67,0.06)] ring-1 ring-[#FBCFE8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]';
                const dot = <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />;
                if (isUrl) {
                  return (
                    <a key={key} href={value} target="_blank" rel="noopener noreferrer" className={`${base} active:bg-[#FDF2F8]`} aria-label={`打开${meta.label}主页`}>
                      {dot}
                      <span>{meta.label}</span>
                      <span className="text-[#C99BB3]"><ExternalIcon /></span>
                    </a>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCopySocial(key, value)}
                    className={`${base} active:bg-[#FDF2F8]`}
                    aria-label={`复制${meta.label}：${value}`}
                  >
                    {dot}
                    <span>{meta.label}</span>
                    <span className="max-w-[8rem] truncate text-[#A87C95]">{copiedKey === key ? '已复制' : value}</span>
                    {copiedKey !== key && <span className="text-[#C99BB3]"><CopyIcon /></span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 作品展示 */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[15px] font-semibold text-[#831843]">作品展示</h3>
            {!loadingWorks && works.length > 0 && (
              <span className="text-xs text-[#A87C95]">{works.length} 件作品</span>
            )}
          </div>
          {loadingWorks ? (
            <div className="columns-2 gap-3">
              {[180, 240, 200, 160].map((h, i) => (
                <div key={i} className="mb-3 animate-pulse rounded-2xl bg-[#F1EEF5] motion-reduce:animate-none" style={{ height: h }} />
              ))}
            </div>
          ) : works.length > 0 ? (
            <div className="columns-2 gap-3 [column-fill:_balance]">
              {works.map((work) => (
                <button
                  key={work.id}
                  type="button"
                  onClick={() => onWorkClick(work.id)}
                  aria-label={`查看作品${work.title ? `：${work.title}` : ''}`}
                  className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-white text-left align-top shadow-[0_2px_12px_rgba(131,24,67,0.07)] ring-1 ring-[#FBCFE8] transition duration-200 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]"
                >
                  {work.coverUrl || work.imageUrls?.[0] ? (
                    <img
                      src={work.coverUrl || work.imageUrls[0]}
                      alt={work.title || '美甲作品'}
                      className="block h-auto w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center text-xs text-[#C99BB3]">暂无图片</div>
                  )}
                  {work.title && (
                    <p className="truncate px-2.5 py-2 text-[12px] font-medium text-[#5B3A4C]">{work.title}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-4 py-12 text-center text-sm text-[#A87C95] ring-1 ring-[#FBCFE8]">
              该美甲师暂未发布作品
            </div>
          )}
        </section>
      </div>

      {/* ===== 底部操作 ===== */}
      <div className="shrink-0 border-t border-[#FBCFE8] bg-white/95 px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom)+0.5rem)] backdrop-blur">
        <div className="flex gap-3">
          <button
            onClick={onShare}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border border-[#EC4899] bg-white text-sm font-semibold text-[#EC4899] transition-colors duration-200 active:bg-[#FDF2F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]"
          >
            <ShareIcon />
            分享给朋友
          </button>
          <button
            onClick={onPrimary}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-[#EC4899] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(236,72,153,0.28)] transition duration-200 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899] focus-visible:ring-offset-2"
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
