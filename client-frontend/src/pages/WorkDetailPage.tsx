import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { worksService, type WorkDetail, type Comment } from '../services/works';

const WorkDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const imageSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadWork(parseInt(id));
    }
  }, [id]);

  const loadWork = async (workId: number) => {
    setLoading(true);
    try {
      const data = await worksService.getWork(workId);
      setWork(data);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to load work:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!work) return;
    try {
      await worksService.likeWork(work.id);
      // Refresh work data
      const updatedWork = await worksService.getWork(work.id);
      setWork(updatedWork);
    } catch (error) {
      console.error('Failed to like work:', error);
    }
  };

  const handleFavorite = async () => {
    if (!work) return;
    try {
      await worksService.favoriteWork(work.id);
      // Refresh work data
      const updatedWork = await worksService.getWork(work.id);
      setWork(updatedWork);
    } catch (error) {
      console.error('Failed to favorite work:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !work) return;
    try {
      await worksService.addComment(work.id, commentText);
      setCommentText('');
      // Refresh comments
      const data = await worksService.getComments(work.id);
      setComments(data);
      // Refresh work to update comment count
      const updatedWork = await worksService.getWork(work.id);
      setWork(updatedWork);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleImageSwipe = (direction: 'left' | 'right') => {
    if (!work) return;
    const maxIndex = work.imageUrls.length - 1;
    if (direction === 'left' && currentImageIndex < maxIndex) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else if (direction === 'right' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleShare = async () => {
    if (!work) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: work.title || '美甲作品',
          text: `查看这个精美的美甲作品：${work.title}`,
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (!work) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <p className="text-[var(--color-text-muted)]">作品不存在</p>
          <button
            onClick={() => navigate('/works')}
            className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-full"
          >
            返回作品集
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--color-bg)]">
      {/* Header buttons */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-[max(0.875rem,env(safe-area-inset-top)+0.5rem)] pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full bg-black/28 px-2 py-1.5 backdrop-blur-md">
            <button
              onClick={() => navigate('/works')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="min-w-0 pr-1">
              <p className="truncate text-sm font-medium text-white">{work.technicianName || '美甲师作品'}</p>
              <p className="text-[11px] text-white/70">作品详情</p>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/28 text-white backdrop-blur-md"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image Slider */}
      <div className="relative h-[58vh] flex-shrink-0 bg-black">
        <div
          ref={imageSliderRef}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {work.imageUrls.map((url, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center"
            >
              <img
                src={url}
                alt={`作品图片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        {/* Image indicators */}
        {work.imageUrls.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {work.imageUrls.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
        {/* Swipe hints */}
        {work.imageUrls.length > 1 && (
          <>
            <button
              onClick={() => handleImageSwipe('right')}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-black/30 text-white"
              style={{ opacity: currentImageIndex > 0 ? 1 : 0 }}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => handleImageSwipe('left')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-black/30 text-white"
              style={{ opacity: currentImageIndex < work.imageUrls.length - 1 ? 1 : 0 }}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Work Info */}
      <div className="relative z-10 -mt-6 flex min-h-0 flex-1 flex-col rounded-t-3xl bg-white">
        <div className="flex-1 overflow-y-auto px-5 pt-5">
        {/* Actions */}
        <div className="mb-4 flex items-center gap-6">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 ${work.isLiked ? 'text-red-500' : 'text-gray-700'}`}
          >
            {work.isLiked ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
            <span className="text-sm">{work.likeCount || 0}</span>
          </button>
          <button
            onClick={handleFavorite}
            className={`flex items-center gap-2 ${work.isFavorited ? 'text-amber-500' : 'text-gray-700'}`}
          >
            {work.isFavorited ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
            <span className="text-sm">收藏</span>
          </button>
        </div>

        {/* Title & Description */}
        <h2 className="mb-2 text-xl font-bold text-gray-900">{work.title || '未命名作品'}</h2>
        <p className="mb-4 text-sm leading-6 text-gray-600">{work.description}</p>

        {/* Tags */}
        {work.tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {work.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-pink-50 px-3 py-1 text-xs text-[var(--color-primary)]">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Comments Section */}
        <div className="border-t border-gray-100 pt-4 pb-6">
          <h3 className="mb-4 text-sm font-medium text-gray-900">评论 ({comments.length})</h3>

          {/* Comments list */}
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs">
                    {comment.technicianId ? '技师' : '我'}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">
                      {comment.technicianId ? '美甲师' : '我'} · {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-800">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] bg-rose-50 px-4 py-5 text-center text-sm text-gray-400">
              暂无评论，欢迎添加第一条评论
            </div>
          )}
        </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom)+0.5rem)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="添加评论..."
              className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm text-white disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkDetailPage;
