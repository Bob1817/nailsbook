import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LoginPromptModal from '../components/LoginPromptModal';
import { publicArtistService, type PublicWorkDetailData } from '../services/publicArtist';

const PublicWorkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [work, setWork] = useState<PublicWorkDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    publicArtistService
      .getWork(parseInt(id, 10))
      .then((res) => {
        if (!cancelled) setWork(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const promptLogin = () => setShowLogin(true);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-8 text-center">
        <p className="text-base font-medium text-[var(--color-text,#1f2230)]">作品不存在或已下架</p>
        <button onClick={() => navigate(-1)} className="rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm text-white">
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-black">
      {/* 顶部返回 */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-start px-4 pt-[max(0.875rem,env(safe-area-inset-top)+0.5rem)]">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 图片 */}
      <div className="relative h-[55vh] flex-shrink-0 bg-black">
        <div
          onScroll={(e) => {
            const el = e.currentTarget;
            setImageIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        >
          {work.imageUrls.map((url, index) => (
            <div key={index} className="flex h-full w-full flex-shrink-0 snap-center items-center justify-center">
              <img src={url} alt={`作品图片 ${index + 1}`} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        {work.imageUrls.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {work.imageUrls.map((_, index) => (
              <div key={index} className={`h-1.5 w-1.5 rounded-full ${index === imageIndex ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        )}
      </div>

      {/* 信息面板 */}
      <div className="relative z-10 -mt-6 flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white">
        <div className="shrink-0 px-5 pt-5 pb-4">
          <h2 className="text-[1.35rem] font-bold leading-tight tracking-[-0.02em] text-gray-900">{work.title || '未命名作品'}</h2>
          {work.description && <p className="mt-2 text-sm leading-6 text-gray-500">{work.description}</p>}
          {work.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {work.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-pink-50 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 美甲师 */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-pink-50 text-xs font-semibold text-[var(--color-primary)]">
              {work.technician.avatarUrl ? (
                <img src={work.technician.avatarUrl} alt={work.technician.name} className="h-full w-full object-cover" />
              ) : (
                work.technician.name.slice(0, 1)
              )}
            </div>
            <span className="text-sm text-gray-600">{work.technician.name}</span>
          </div>

          {/* 操作（未登录 -> 登录提示） */}
          <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
            <button
              onClick={promptLogin}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-50 py-2.5 text-sm font-medium text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>喜欢</span>
              {work.likeCount > 0 && <span className="text-xs text-gray-400">{work.likeCount}</span>}
            </button>
            <button
              onClick={promptLogin}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-50 py-2.5 text-sm font-medium text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>收藏</span>
            </button>
          </div>
        </div>

        {/* 评论（只读） */}
        <div className="flex-1 overflow-y-auto border-t border-gray-100 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">评论</h3>
            <span className="text-xs text-gray-400">{work.commentCount} 条</span>
          </div>
          {work.comments.length > 0 ? (
            <div className="space-y-3">
              {work.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[11px] font-semibold text-gray-500">
                    {c.user.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt={c.user.name} className="h-full w-full object-cover" />
                    ) : (
                      c.user.name.slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <span className="font-medium text-gray-700">{c.user.name}</span>
                      {c.user.role === 'technician' && (
                        <span className="rounded-full bg-pink-100 px-1.5 py-px text-[10px] font-medium text-pink-500">美甲师</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-gray-800">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">暂无评论</div>
          )}
        </div>

        {/* 底部：点击触发登录 */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom)+0.5rem)]">
          <button
            onClick={promptLogin}
            className="h-11 w-full rounded-full border border-gray-200 bg-gray-50 px-4 text-left text-sm text-gray-400"
          >
            添加评论…
          </button>
        </div>
      </div>

      <LoginPromptModal open={showLogin} onLogin={() => navigate('/login')} onClose={() => setShowLogin(false)} />
    </div>
  );
};

export default PublicWorkDetail;
