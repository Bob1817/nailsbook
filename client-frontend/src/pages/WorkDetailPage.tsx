import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { worksService, type Comment, type WorkDetail } from '../services/works';

// ─── CommentItem ────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: number) => void;
  actionMenuId: number | null;
  setActionMenuId: (id: number | null) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onDelete,
  actionMenuId,
  setActionMenuId,
}) => {
  const isDeleted = comment.user.role === 'unknown';

  return (
    <div className={`flex gap-3 ${comment.isHidden ? 'opacity-60' : ''}`}>
      {/* Avatar */}
      {comment.user.avatarUrl ? (
        <img
          src={comment.user.avatarUrl}
          alt={comment.user.name}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${
            comment.user.role === 'technician' ? 'bg-[#FF6B8A]' : 'bg-gray-400'
          }`}
        >
          {comment.user.name.slice(0, 1)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="relative rounded-2xl bg-gray-50 px-3 py-2">
          {/* Name row */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="font-medium text-gray-700">{comment.user.name}</span>
            {comment.user.role === 'technician' && (
              <span className="rounded-full bg-pink-100 px-1.5 py-px text-[10px] font-medium text-pink-500">
                美甲师
              </span>
            )}
            {comment.isPinned && (
              <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-600">
                置顶
              </span>
            )}
            {comment.isHidden && (
              <span className="rounded-full bg-gray-200 px-1.5 py-px text-[10px] font-medium text-gray-500">
                已隐藏
              </span>
            )}
            <span className="ml-auto">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Content — click to reply */}
          <p
            className={`mt-1 text-sm leading-5 ${isDeleted ? 'italic text-gray-400' : 'cursor-pointer text-gray-800 active:opacity-70'}`}
            onClick={() => !isDeleted && onReply(comment)}
          >
            {comment.content}
          </p>

          {/* More button (own comments only) */}
          {comment.isAuthor && !isDeleted && (
            <div className="absolute right-2 top-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActionMenuId(actionMenuId === comment.id ? null : comment.id);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 active:bg-gray-200"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>

              {actionMenuId === comment.id && (
                <div className="absolute right-0 top-7 z-30 w-28 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5">
                  <button
                    onClick={() => {
                      setActionMenuId(null);
                      onDelete(comment.id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-500 active:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-100">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onDelete={onDelete}
                actionMenuId={actionMenuId}
                setActionMenuId={setActionMenuId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ConfirmDialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-6">
    <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl">
      <p className="text-center text-sm leading-6 text-gray-700">{message}</p>
      <div className="mt-5 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-medium text-white"
        >
          确认
        </button>
      </div>
    </div>
  </div>
);

// ─── HiddenCommentsSection ───────────────────────────────────────────────────

interface HiddenCommentsSectionProps {
  comments: Comment[];
  onReply: (c: Comment) => void;
  onDelete: (id: number) => void;
  actionMenuId: number | null;
  setActionMenuId: (id: number | null) => void;
}

const HiddenCommentsSection: React.FC<HiddenCommentsSectionProps> = ({
  comments, onReply, onDelete, actionMenuId, setActionMenuId,
}) => {
  const [expanded, setExpanded] = useState(false);
  if (comments.length === 0) return null;

  return (
    <div className="mt-4 border-t border-dashed border-gray-200 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-gray-400"
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {expanded ? '收起隐藏评论' : `查看 ${comments.length} 条隐藏评论`}
      </button>
      {expanded && (
        <div className="mt-3 space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onReply={onReply}
              onDelete={onDelete}
              actionMenuId={actionMenuId}
              setActionMenuId={setActionMenuId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── WorkDetailPage ──────────────────────────────────────────────────────────

const WorkDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const imageSliderRef = useRef<HTMLDivElement>(null);

  const loadWork = useCallback(async (workId: number) => {
    setLoading(true);
    try {
      const data = await worksService.getWork(workId);
      setWork(data);
      setComments(data.comments || []);
    } catch {
      console.error('Failed to load work');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) loadWork(parseInt(id));
  }, [id, loadWork]);

  // Close action menu on outside click
  useEffect(() => {
    if (actionMenuId === null) return;
    const close = () => setActionMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [actionMenuId]);

  const refreshComments = async (workId: number) => {
    const data = await worksService.getComments(workId);
    setComments(data);
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo({ id: comment.id, name: comment.user.name });
    setTimeout(() => commentInputRef.current?.focus(), 50);
  };

  const handleDeleteRequest = (commentId: number) => {
    setConfirmDelete(commentId);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete || !work) return;
    setConfirmDelete(null);
    try {
      await worksService.deleteComment(work.id, confirmDelete);
      await refreshComments(work.id);
      const updated = await worksService.getWork(work.id);
      setWork(updated);
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !work) return;
    try {
      await worksService.addComment(work.id, commentText, replyingTo?.id);
      setCommentText('');
      setReplyingTo(null);
      await refreshComments(work.id);
      const updatedWork = await worksService.getWork(work.id);
      setWork(updatedWork);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleLike = async () => {
    if (!work) return;
    try {
      await worksService.likeWork(work.id);
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
      const updatedWork = await worksService.getWork(work.id);
      setWork(updatedWork);
    } catch (error) {
      console.error('Failed to favorite work:', error);
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
        await navigator.share({ title: work.title || '美甲作品', url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      }
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'AbortError') return;
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

  const visibleComments = comments.filter((c) => !c.isHidden);
  const hiddenComments = comments.filter((c) => c.isHidden);

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-black">
      {/* Header */}
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
      <div className="relative h-[55vh] flex-shrink-0 bg-black">
        <div
          ref={imageSliderRef}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {work.imageUrls.map((url, index) => (
            <div key={index} className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center">
              <img src={url} alt={`作品图片 ${index + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        {work.imageUrls.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {work.imageUrls.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
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

      {/* Work Info Panel */}
      <div className="relative z-10 -mt-6 flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.06)]">
        {/* Title block */}
        <div className="shrink-0 px-5 pt-5 pb-4">
          <h2 className="text-[1.35rem] font-bold leading-tight tracking-[-0.02em] text-gray-900">
            {work.title || '未命名作品'}
          </h2>
          {work.description && (
            <p className="mt-2 text-sm leading-6 text-gray-500">{work.description}</p>
          )}
          {work.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {work.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-pink-50 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
            <button
              onClick={handleLike}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium transition-colors ${
                work.isLiked ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-600'
              }`}
            >
              {work.isLiked ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              <span>{work.isLiked ? '已喜欢' : '喜欢'}</span>
              {(work.likeCount || 0) > 0 && <span className="text-xs text-gray-400">{work.likeCount}</span>}
            </button>
            <button
              onClick={handleFavorite}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium transition-colors ${
                work.isFavorited ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-600'
              }`}
            >
              {work.isFavorited ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
              <span>{work.isFavorited ? '已收藏' : '收藏'}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Comments — scrollable */}
        <div className="flex-1 overflow-y-auto border-t border-gray-100 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">评论</h3>
            <span className="text-xs text-gray-400">{visibleComments.length} 条</span>
          </div>

          {visibleComments.length > 0 ? (
            <div className="space-y-3">
              {visibleComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDeleteRequest}
                  actionMenuId={actionMenuId}
                  setActionMenuId={setActionMenuId}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
              暂无评论，欢迎添加第一条评论
            </div>
          )}

          <HiddenCommentsSection
            comments={hiddenComments}
            onReply={handleReply}
            onDelete={handleDeleteRequest}
            actionMenuId={actionMenuId}
            setActionMenuId={setActionMenuId}
          />
        </div>

        {/* Comment input bar */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom)+0.5rem)]">
          {replyingTo && (
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
              <span>回复 <span className="font-medium text-[var(--color-primary)]">@{replyingTo.name}</span></span>
              <button
                onClick={() => setReplyingTo(null)}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyingTo ? `回复 @${replyingTo.name}...` : '添加评论...'}
              className="h-11 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm focus:border-[var(--color-primary)] focus:bg-white focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleAddComment();
                }
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="h-11 rounded-full bg-[var(--color-primary)] px-5 text-sm font-medium text-white disabled:opacity-40"
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {confirmDelete !== null && (
        <ConfirmDialog
          message="确定要删除这条评论吗？"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

export default WorkDetailPage;
