import React, { useEffect, useState } from 'react';
import { useToast } from './ToastProvider';
import { worksService, type NailWork } from '../services/works';
import type { Technician } from '../services/auth';

interface ArtistCardModalProps {
  technician: Technician;
  onClose: () => void;
}

const ArtistCardModal: React.FC<ArtistCardModalProps> = ({ technician, onClose }) => {
  const toast = useToast();
  const [works, setWorks] = useState<NailWork[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);

  const isAccepting = technician.status === 'active';
  const inviteLink = technician.invitationCode
    ? `${window.location.origin}/invite?invite_code=${encodeURIComponent(technician.invitationCode)}`
    : '';

  useEffect(() => {
    let cancelled = false;
    setLoadingWorks(true);
    worksService
      .getWorks(technician.id)
      .then((data) => {
        if (!cancelled) setWorks(data);
      })
      .catch(() => {
        if (!cancelled) setWorks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWorks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [technician.id]);

  // 进入时锁定背景滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleBook = () => {
    if (!inviteLink) {
      toast.warning('该美甲师暂无可用邀请链接');
      return;
    }
    window.open(inviteLink, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    if (!inviteLink) {
      toast.warning('该美甲师暂无可用分享链接');
      return;
    }
    const shareText = `推荐美甲师「${technician.name}」${technician.city ? ` · ${technician.city}` : ''}，点击查看并预约：`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `美甲师 ${technician.name}`, text: shareText, url: inviteLink });
      } else {
        await navigator.clipboard.writeText(inviteLink);
        toast.success('当前环境不支持分享，名片链接已复制');
      }
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(inviteLink);
        toast.success('名片链接已复制');
      } catch {
        toast.error('分享失败，请重试');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[var(--color-bg,#fff)] bg-white">
      {/* 顶部栏 */}
      <div className="relative shrink-0 bg-[linear-gradient(135deg,#FF6B8A_0%,#FF9AB0_55%,#FFC8B2_100%)] px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4 pt-2">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/40 bg-white/20">
            {technician.avatarUrl ? (
              <img src={technician.avatarUrl} alt={technician.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{technician.name.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.4rem] font-semibold tracking-[-0.02em] text-white [text-shadow:0_1px_3px_rgba(112,35,71,0.22)]">
              {technician.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {technician.city && (
                <span className="rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-medium text-white">📍 {technician.city}</span>
              )}
              {technician.homeService && (
                <span className="rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-medium text-white">可上门</span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  isAccepting ? 'bg-emerald-400/90 text-white' : 'bg-white/20 text-white/90'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isAccepting ? 'bg-white' : 'bg-white/70'}`} />
                {isAccepting ? '接单中' : '休息中'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 作品展示 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">作品展示</h3>
        {loadingWorks ? (
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-[16px] bg-slate-100" />
            ))}
          </div>
        ) : works.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {works.map((work) => (
              <div key={work.id} className="overflow-hidden rounded-[16px] bg-slate-100">
                <div className="aspect-square w-full">
                  {work.coverUrl || work.imageUrls?.[0] ? (
                    <img
                      src={work.coverUrl || work.imageUrls[0]}
                      alt={work.title || '作品'}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">暂无图片</div>
                  )}
                </div>
                {work.title && (
                  <p className="truncate px-2 py-1.5 text-[12px] text-[var(--color-text)]">{work.title}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
            该美甲师暂未发布作品
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom)+0.5rem)]">
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 rounded-full border border-[var(--color-primary)] bg-white py-3 text-sm font-semibold text-[var(--color-primary)] active:bg-pink-50"
          >
            分享该美甲师
          </button>
          <button
            onClick={handleBook}
            className="flex-1 rounded-full bg-[var(--color-primary)] py-3 text-sm font-semibold text-white active:opacity-90"
          >
            预约该美甲师
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistCardModal;
