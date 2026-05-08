import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { worksService, type Work } from '../services/works';
import { uploadService } from '../services/upload';

const WorksPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    images: [] as string[],
    isVisible: true,
  });
  const [uploading, setUploading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const imageSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWorks();
  }, []);

  const loadWorks = async () => {
    setLoading(true);
    try {
      const data = await worksService.list();
      setWorks(data);
    } catch (error) {
      console.error('Failed to load works:', error);
      toast.error('加载作品失败');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (formData.images.length >= 5) {
      toast.warning('最多只能上传5张图片');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadService.uploadImage(file);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, result.url],
      }));
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.warning('请输入作品标题');
      return;
    }

    if (formData.images.length === 0) {
      toast.warning('请至少上传一张图片');
      return;
    }

    try {
      if (editingWork) {
        await worksService.update(editingWork.id, {
          title: formData.title,
          description: formData.description,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          coverUrl: formData.images[0],
          images: formData.images,
          isVisible: formData.isVisible,
        });
        toast.success('作品更新成功');
      } else {
        await worksService.create({
          title: formData.title,
          description: formData.description,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          coverUrl: formData.images[0],
          images: formData.images,
          isVisible: formData.isVisible,
        });
        toast.success('作品创建成功');
      }
      setShowCreateModal(false);
      setEditingWork(null);
      setFormData({ title: '', description: '', tags: '', images: [], isVisible: true });
      loadWorks();
    } catch (error) {
      console.error('Failed to save work:', error);
      toast.error('保存失败');
    }
  };

  const handleEdit = (work: Work) => {
    setEditingWork(work);
    setFormData({
      title: work.title || '',
      description: work.description || '',
      tags: work.tags.join(','),
      images: work.imageUrls,
      isVisible: work.isVisible,
    });
    setShowCreateModal(true);
    setShowActionMenu(false);
  };

  const handleDelete = async (work: Work) => {
    if (!confirm('确定要删除这个作品吗？')) return;
    try {
      await worksService.delete(work.id);
      toast.success('作品删除成功');
      setShowDetailModal(false);
      setShowActionMenu(false);
      loadWorks();
    } catch (error) {
      console.error('Failed to delete work:', error);
      toast.error('删除失败');
    }
  };

  const handleToggleVisible = async (work: Work) => {
    try {
      await worksService.toggleVisible(work.id);
      toast.success(work.isVisible ? '作品已隐藏' : '作品已显示');
      setShowActionMenu(false);
      loadWorks();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      toast.error('操作失败');
    }
  };

  const handleTogglePinned = async (work: Work) => {
    try {
      await worksService.togglePinned(work.id);
      toast.success(work.isPinned ? '已取消置顶' : '已置顶');
      setShowActionMenu(false);
      loadWorks();
    } catch (error) {
      console.error('Failed to toggle pinned:', error);
      toast.error('操作失败');
    }
  };

  const handleToggleFeatured = async (work: Work) => {
    try {
      await worksService.toggleFeatured(work.id);
      toast.success(work.isFeatured ? '已取消精品' : '已设为精品');
      setShowActionMenu(false);
      loadWorks();
    } catch (error) {
      console.error('Failed to toggle featured:', error);
      toast.error('操作失败');
    }
  };

  const openWorkDetail = async (work: Work) => {
    setSelectedWork(work);
    setCurrentImageIndex(0);
    setShowDetailModal(true);
    setShowActionMenu(false);
    await loadComments(work.id);
    // 标记评论为已读
    if (work.unreadComments > 0) {
      try {
        await worksService.markCommentsAsRead(work.id);
        // 更新本地状态
        setWorks(prev => prev.map(w => w.id === work.id ? { ...w, unreadComments: 0 } : w));
      } catch (error) {
        console.error('Failed to mark comments as read:', error);
      }
    }
  };

  const loadComments = async (workId: number) => {
    try {
      const data = await worksService.getComments(workId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleLike = async (work: Work, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const result = await worksService.likeWork(work.id);
      toast.success(result.liked ? '已点赞' : '已取消点赞');
      // 刷新作品列表
      const updatedWorks = await worksService.list();
      setWorks(updatedWorks);
      // 同步更新当前选中的作品状态
      if (selectedWork && selectedWork.id === work.id) {
        const updatedWork = updatedWorks.find(w => w.id === work.id);
        if (updatedWork) {
          setSelectedWork(updatedWork);
        }
      }
    } catch (error) {
      console.error('Failed to like work:', error);
      toast.error('操作失败');
    }
  };

  const handleFavorite = async (work: Work, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const result = await worksService.favoriteWork(work.id);
      toast.success(result.favorited ? '已收藏' : '已取消收藏');
      // 刷新作品列表
      const updatedWorks = await worksService.list();
      setWorks(updatedWorks);
      // 同步更新当前选中的作品状态
      if (selectedWork && selectedWork.id === work.id) {
        const updatedWork = updatedWorks.find(w => w.id === work.id);
        if (updatedWork) {
          setSelectedWork(updatedWork);
        }
      }
    } catch (error) {
      console.error('Failed to favorite work:', error);
      toast.error('操作失败');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedWork) return;
    try {
      await worksService.addComment(selectedWork.id, commentText);
      setCommentText('');
      toast.success('评论已发布');
      // 刷新评论列表
      await loadComments(selectedWork.id);
      // 刷新作品列表以更新评论数
      const updatedWorks = await worksService.list();
      setWorks(updatedWorks);
      // 同步更新当前选中的作品状态
      const updatedWork = updatedWorks.find(w => w.id === selectedWork.id);
      if (updatedWork) {
        setSelectedWork(updatedWork);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('评论失败');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!selectedWork) return;
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      await worksService.deleteComment(selectedWork.id, commentId);
      toast.success('评论已删除');
      loadComments(selectedWork.id);
      loadWorks();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('删除评论失败');
    }
  };

  const handleImageSwipe = (direction: 'left' | 'right') => {
    if (!selectedWork) return;
    const maxIndex = selectedWork.imageUrls.length - 1;
    if (direction === 'left' && currentImageIndex < maxIndex) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else if (direction === 'right' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Masonry layout calculation
  const getMasonryLayout = () => {
    const columns: Work[][] = [[], [], []];
    works.forEach((work, index) => {
      columns[index % 3].push(work);
    });
    return columns;
  };

  return (
    <div className="min-h-full bg-[#fff9f8] pb-8">
      {/* Header - 二级页面顶部，带返回图标 */}
      <div className="bg-white/80 px-4 pt-12 pb-4 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          >
            <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">作品管理</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 text-white active:bg-pink-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-500 pl-1">管理您的美甲作品，展示给客户</p>
      </div>

      {/* Masonry Photo Wall */}
      <div className="px-3 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          </div>
        ) : works.length === 0 ? (
          <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_8px_24px_rgba(29,35,53,0.04)]">
            <div className="mb-4 text-4xl">🎨</div>
            <p className="text-gray-500">还没有作品</p>
            <p className="mt-1 text-sm text-gray-400">点击右上角添加您的第一个作品</p>
          </div>
        ) : (
          <div className="flex gap-2">
            {getMasonryLayout().map((column, colIndex) => (
              <div key={colIndex} className="flex-1 flex flex-col gap-3">
                {column.map((work) => (
                  <div
                    key={work.id}
                    onClick={() => openWorkDetail(work)}
                    className="relative overflow-hidden rounded-[12px] bg-gray-100 cursor-pointer"
                  >
                    {/* Image */}
                    {work.coverUrl || work.imageUrls?.[0] ? (
                      <img
                        src={work.coverUrl || work.imageUrls[0]}
                        alt={work.title || '作品'}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                          const nextElement = event.currentTarget.nextElementSibling as HTMLElement | null;
                          if (nextElement?.dataset.placeholder === 'true') {
                            nextElement.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      data-placeholder="true"
                      className={`min-h-[9rem] w-full items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50 text-sm text-gray-400 ${
                        work.coverUrl || work.imageUrls?.[0] ? 'hidden' : 'flex'
                      }`}
                    >
                      暂无作品图片
                    </div>

                    {/* Info overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm font-medium truncate">{work.title || '未命名作品'}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-white/80 text-xs">{work.technicianName}</span>
                        <span className="text-white/80 text-xs flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                          </svg>
                          {work.likeCount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Badges */}
                    {work.isPinned && (
                      <div className="absolute top-2 left-2 rounded-full bg-pink-500 px-2 py-0.5 text-[10px] text-white">
                        置顶
                      </div>
                    )}
                    {work.isFeatured && (
                      <div className="absolute top-2 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white" style={{ marginTop: work.isPinned ? '20px' : '0' }}>
                        精品
                      </div>
                    )}
                    {!work.isVisible && (
                      <div className="absolute top-2 right-2 rounded-full bg-gray-500/80 px-2 py-0.5 text-[10px] text-white">
                        已隐藏
                      </div>
                    )}
                    {/* 未读评论提示 */}
                    {work.unreadComments > 0 && (
                      <div className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        {work.unreadComments}条新评论
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Work Detail Modal */}
      {showDetailModal && selectedWork && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-black/24 via-black/8 to-transparent" />

          {/* Header buttons */}
          <div className="absolute top-0 left-0 right-0 z-20 flex justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
            <button
              onClick={() => setShowDetailModal(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Action menu button */}
            <div className="relative">
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showActionMenu && (
                <div className="absolute right-0 top-12 w-40 bg-white rounded-xl shadow-lg py-2 z-30">
                  <button
                    onClick={() => handleEdit(selectedWork)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    编辑
                  </button>
                  <button
                    onClick={() => handleTogglePinned(selectedWork)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {selectedWork.isPinned ? '取消置顶' : '置顶'}
                  </button>
                  <button
                    onClick={() => handleToggleFeatured(selectedWork)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {selectedWork.isFeatured ? '取消精品' : '设为精品'}
                  </button>
                  <button
                    onClick={() => handleToggleVisible(selectedWork)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={selectedWork.isVisible ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} />
                    </svg>
                    {selectedWork.isVisible ? '隐藏' : '显示'}
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => handleDelete(selectedWork)}
                    className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Image Slider - 图片宽度充满屏幕 */}
          <div className="relative h-[52vh] flex-shrink-0 bg-black">
            <div
              ref={imageSliderRef}
              className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              style={{ scrollBehavior: 'smooth' }}
            >
              {selectedWork.imageUrls.map((url, index) => (
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
            {selectedWork.imageUrls.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {selectedWork.imageUrls.map((_, index) => (
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
            {selectedWork.imageUrls.length > 1 && (
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
                  style={{ opacity: currentImageIndex < selectedWork.imageUrls.length - 1 ? 1 : 0 }}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Work Info */}
          <div className="relative z-10 -mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-3xl bg-white px-5 pt-6 pb-8">
            {/* Actions */}
            <div className="flex items-center gap-6 mb-4">
              <button
                onClick={() => handleLike(selectedWork)}
                className={`flex items-center gap-2 ${selectedWork.isLiked ? 'text-red-500' : 'text-gray-700'}`}
              >
                {selectedWork.isLiked ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
                <span className="text-sm">{selectedWork.likeCount || 0}</span>
              </button>
              <button
                onClick={() => handleFavorite(selectedWork)}
                className={`flex items-center gap-2 ${selectedWork.isFavorited ? 'text-amber-500' : 'text-gray-700'}`}
              >
                {selectedWork.isFavorited ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                )}
                <span className="text-sm">{selectedWork.favoriteCount || 0}</span>
              </button>
            </div>

            {/* Title & Description */}
            <h2 className="text-lg font-bold text-gray-900 mb-2">{selectedWork.title}</h2>
            <p className="text-sm text-gray-600 mb-4">{selectedWork.description}</p>

            {/* Tags */}
            {selectedWork.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedWork.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-pink-50 px-3 py-1 text-xs text-pink-500">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Comments Section */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">评论 ({comments.length})</h3>

              {/* Add comment */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="添加评论..."
                  className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-pink-500 focus:outline-none"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="rounded-full bg-pink-500 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  发送
                </button>
              </div>

              {/* Comments list */}
              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs">
                        {comment.technicianId ? '技师' : '用户'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {comment.technicianId ? '美甲师' : '客户'} · {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                          {/* 删除按钮 - 美甲师可以删除所有评论 */}
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            删除
                          </button>
                        </div>
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
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingWork ? '编辑作品' : '新建作品'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingWork(null);
                  setFormData({ title: '', description: '', tags: '', images: [], isVisible: true });
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
              >
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">作品标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="例如：法式渐变美甲"
                  className="w-full rounded-[16px] border border-gray-200 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">作品说明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="描述作品的特点、风格等"
                  rows={3}
                  className="w-full rounded-[16px] border border-gray-200 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="例如：法式,渐变,简约"
                  className="w-full rounded-[16px] border border-gray-200 px-4 py-3 text-sm focus:border-pink-500 focus:outline-none"
                />
              </div>

              {/* Images */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  作品图片 <span className="text-gray-400">({formData.images.length}/5)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-[12px]">
                      <img src={url} alt={`作品图片${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {formData.images.length < 5 && (
                    <label className="flex aspect-square cursor-pointer items-center justify-center rounded-[12px] border-2 border-dashed border-gray-300 bg-gray-50">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      {uploading ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                      ) : (
                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">立即显示</span>
                <button
                  onClick={() => setFormData((prev) => ({ ...prev, isVisible: !prev.isVisible }))}
                  className={`relative h-7 w-12 rounded-full transition-colors ${formData.isVisible ? 'bg-pink-500' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${formData.isVisible ? 'left-6' : 'left-1'}`}
                  />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              className="mt-6 w-full rounded-[20px] bg-pink-500 py-3 font-medium text-white active:bg-pink-600"
            >
              {editingWork ? '保存修改' : '创建作品'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorksPage;
