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

const SOCIAL_META: Record<string, { label: string; icon: string }> = {
  weibo: { label: '微博', icon: '🔴' },
  xiaohongshu: { label: '小红书', icon: '📕' },
  douyin: { label: '抖音', icon: '🎵' },
  kuaishou: { label: '快手', icon: '📱' },
  wechat: { label: '微信', icon: '💬' },
};

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
      // 复制失败时静默处理
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#fafafb]">
      {/* ===== 头部：基本信息 ===== */}
      <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#FF6B8A_0%,#FF9AB0_55%,#FFC8B2_100%)] px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-7">
        <div className="absolute right-[-12%] top-[-20%] h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="relative flex items-center gap-4 pt-2">
          <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[26px] border-2 border-white/50 bg-white/20 shadow-[0_10px_24px_rgba(112,35,71,0.2)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{name.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.5rem] font-bold tracking-[-0.02em] text-white [text-shadow:0_1px_3px_rgba(112,35,71,0.25)]">
              {name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {city && (
                <span className="rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-medium text-white">📍 {city}</span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  isAccepting ? 'bg-emerald-400/95 text-white' : 'bg-white/20 text-white/90'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isAccepting ? 'bg-white' : 'bg-white/70'}`} />
                {isAccepting ? '接单中' : '休息中'}
              </span>
            </div>
          </div>
        </div>

        {/* 服务方式 */}
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {homeService && (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#FF5E93]">🚗 可上门</span>
          )}
          {shopService && (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#FF5E93]">🏪 可到店</span>
          )}
          {serviceArea && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white">服务范围：{serviceArea}</span>
          )}
        </div>
      </div>

      {/* ===== 内容区 ===== */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* 媒体信息 */}
        {socialEntries.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2.5 text-sm font-semibold text-[var(--color-text)]">社交媒体</h3>
            <div className="flex flex-wrap gap-2">
              {socialEntries.map(([key, value]) => {
                const meta = SOCIAL_META[key];
                const isUrl = /^https?:\/\//i.test(value);
                const chipClass =
                  'inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[13px] font-medium text-[var(--color-text)] shadow-[0_4px_14px_rgba(15,23,42,0.05)] ring-1 ring-black/5 active:bg-slate-50';
                const content = (
                  <>
                    <span className="text-base">{meta.icon}</span>
                    <span>{meta.label}</span>
                  </>
                );
                // URL 类社交媒体 -> 直接跳转
                if (isUrl) {
                  return (
                    <a key={key} href={value} target="_blank" rel="noopener noreferrer" className={chipClass}>
                      {content}
                      <svg className="h-3.5 w-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  );
                }
                // 非 URL（如微信号/账号）-> 点击复制
                return (
                  <button key={key} type="button" onClick={() => handleCopySocial(key, value)} className={chipClass}>
                    {content}
                    <span className="text-[var(--color-text-muted)]">{copiedKey === key ? '已复制' : value}</span>
                    {copiedKey !== key && (
                      <svg className="h-3.5 w-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 作品展示 */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">作品展示</h3>
            {!loadingWorks && works.length > 0 && (
              <span className="text-xs text-[var(--color-text-muted)]">{works.length} 件作品</span>
            )}
          </div>
          {loadingWorks ? (
            <div className="columns-2 gap-2.5">
              {[180, 240, 200, 160].map((h, i) => (
                <div
                  key={i}
                  className="mb-2.5 animate-pulse rounded-[16px] bg-slate-100"
                  style={{ height: h }}
                />
              ))}
            </div>
          ) : works.length > 0 ? (
            <div className="columns-2 gap-2.5 [column-fill:_balance]">
              {works.map((work) => (
                <button
                  key={work.id}
                  type="button"
                  onClick={() => onWorkClick(work.id)}
                  className="mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-[16px] bg-slate-100 text-left align-top active:opacity-90"
                >
                  {work.coverUrl || work.imageUrls?.[0] ? (
                    <img
                      src={work.coverUrl || work.imageUrls[0]}
                      alt={work.title || '作品'}
                      className="block h-auto w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center text-xs text-slate-400">暂无图片</div>
                  )}
                  {work.title && (
                    <p className="truncate px-2 py-1.5 text-[12px] text-[var(--color-text)]">{work.title}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] bg-white px-4 py-10 text-center text-sm text-[var(--color-text-muted)] ring-1 ring-black/5">
              该美甲师暂未发布作品
            </div>
          )}
        </section>
      </div>

      {/* ===== 底部操作 ===== */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom)+0.5rem)]">
        <div className="flex gap-3">
          <button
            onClick={onShare}
            className="flex-1 rounded-full border border-[var(--color-primary)] bg-white py-3 text-sm font-semibold text-[var(--color-primary)] active:bg-pink-50"
          >
            分享给朋友
          </button>
          <button
            onClick={onPrimary}
            className="flex-1 rounded-full bg-[var(--color-primary)] py-3 text-sm font-semibold text-white active:opacity-90"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistCardView;
