import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { designService, type DesignRequest } from '../services/design';
import dayjs from 'dayjs';

const DesignList: React.FC = () => {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDesigns = useCallback(async () => {
    try {
      const data = await designService.getDesigns();
      setDesigns(data);
    } catch {
      console.error('Failed to load designs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending_quote': '待报价',
      'quoted': '已报价',
      'accepted': '已接受',
      'rejected': '已拒绝',
      'converted': '已转预约',
      'cancelled': '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass =
      'inline-flex items-center rounded-full border px-2.5 py-1 text-caption font-medium backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.12)]';
    const styleMap: Record<string, string> = {
      'pending_quote': 'border-white/55 bg-white/42 text-[var(--nb-ink)]',
      'quoted': 'border-[var(--nb-line)]/80 bg-[var(--nb-page)]/35 text-[var(--nb-ink)]',
      'accepted': 'border-[var(--nb-line)]/80 bg-[var(--nb-page)]/35 text-[var(--nb-ink)]',
      'rejected': 'border-[var(--nb-line)]/80 bg-[var(--nb-page)]/35 text-[var(--nb-ink)]',
      'converted': 'border-[var(--nb-line)]/80 bg-[var(--nb-page)]/35 text-[var(--nb-ink)]',
      'cancelled': 'border-[var(--nb-line)]/80 bg-[var(--nb-page)]/40 text-[var(--nb-ink)]',
    };
    return `${baseClass} ${styleMap[status] || 'border-white/55 bg-white/42 text-[var(--nb-ink)]'}`;
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--nb-page)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/60 bg-white/82 px-5 app-header-safe pb-3 backdrop-blur-md">
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
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-[var(--color-text)]">我的设计</h1>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] shadow-sm ring-1 ring-black/5">
                {designs.length} 条记录
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Design Entry */}
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/designs/customize')}
            className="group relative overflow-hidden rounded-[28px] bg-white p-5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5 active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.08),transparent_32%)]" />
            <div className="relative">
              <span className="inline-flex rounded-full bg-[var(--nb-page)] px-3 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                创意定制
              </span>
              <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--nb-action)] shadow-lg shadow-black/70">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div className="mt-5">
                <p className="text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--color-text)]">设计美甲</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">从风格、配色到甲型，发起你的专属灵感需求</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/designs/create')}
            className="group relative overflow-hidden rounded-[28px] bg-white p-5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5 active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.08),transparent_32%)]" />
            <div className="relative">
              <span className="inline-flex rounded-full bg-[var(--nb-page)] px-3 py-1 text-[11px] font-medium text-[var(--nb-secondary)]">
                图稿参考
              </span>
              <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--nb-action)] shadow-lg shadow-black/70">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="mt-5">
                <p className="text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--color-text)]">上传设计</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">上传喜欢的参考图，与美甲师沟通细节和设计方向</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Design List - Photo Wall */}
      <div className="px-5 mt-6 pb-5">
        {designs.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-heading-3 text-[var(--color-text)]">设计记录</h2>
                <p className="mt-1 text-caption text-[var(--color-text-muted)]">查看设计素材、灵感需求与状态变化</p>
              </div>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[var(--color-text-secondary)] ring-1 ring-black/5 backdrop-blur">
                {designs.length} 个设计
              </span>
            </div>

            <div className="columns-2 gap-3 [column-fill:_balance]">
              {designs.map((design, index) => (
                <div
                  key={design.id}
                  onClick={() => navigate(`/designs/${design.id}`)}
                  className={`group relative mb-3 break-inside-avoid overflow-hidden rounded-[24px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/5 cursor-pointer active:scale-[0.98] transition-transform ${
                    index % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square'
                  }`}
                >
                  {design.imageUrls.length > 0 ? (
                    <img
                      src={design.imageUrls[0]}
                      alt="设计"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-[var(--nb-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent" />

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={getStatusBadgeClass(design.status)}>
                      {getStatusText(design.status)}
                    </span>
                  </div>

                  <div className="absolute right-3 top-3 rounded-full bg-black/24 px-2.5 py-1 text-[10px] text-white backdrop-blur-md">
                    设计动态
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="line-clamp-1 text-sm font-semibold">{design.title || '未命名设计'}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-white/78">
                      {design.description || '暂无描述'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-white/72">
                        {dayjs(design.createdAt).format('MM-DD')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-[28px] bg-white px-6 py-16 text-center shadow-[0_12px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--nb-page)] flex items-center justify-center">
              <svg className="w-10 h-10 text-[var(--nb-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-body text-[var(--color-text-muted)] mb-2">暂无设计作品</p>
            <p className="text-caption text-[var(--color-text-muted)]">点击上方按钮创建你的第一个美甲设计</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignList;
