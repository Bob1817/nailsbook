const uiColors = require('../../../utils/colors');
const api = require('../../../services/api');
const { normalizeWorkDetail } = require('../../../utils/normalize-work');

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日`;
}

function processComment(c) {
  const userName = c.user && c.user.name;
  return {
    ...c,
    createdAtText: formatTime(c.createdAt),
    userInitial: (userName || '用').charAt(0),
    replies: (c.replies || []).map(processComment)
  };
}

Page({
  data: {
    sharePath: '',
    work: {},
    imageUrls: [],
    comments: [],
    visibleComments: [],
    hiddenComments: [],
    loading: false,
    loadFailed: false,
    loadErrorText: '',
    canRetryLoad: false,
    currentImageIndex: 0,
    viewerOpen: false,
    viewerIndex: 0,
    viewerCloseTop: 48,
    showHidden: false,
    commentText: '',
    submittingComment: false,
    replyingTo: null,
    scrollTarget: '',
    socialLoading: false
  },

  onLoad(options) {
    try {
      const rect = wx.getMenuButtonBoundingClientRect();
      this.setData({ viewerCloseTop: rect.top });
    } catch (e) {}
    if (options.id) {
      this.workId = parseInt(options.id);
      this.loadWork();
      if (options.focus === 'comments') setTimeout(() => this.setData({ commentFocused: true }), 120);
    } else {
      this.setData({ loadFailed: true, loadErrorText: '作品参数无效', canRetryLoad: false });
    }
  },

  onShow() {
    if (this.workId) {
      this.loadWork();
    }
  },

  async loadWork() {
    if (this._loadingWork || !this.workId) return;
    this.setData({ sharePath: '' });
    wx.hideShareMenu();
    this._loadingWork = true;
    this.setData({ loading: true, loadFailed: false, loadErrorText: '', canRetryLoad: false });
    try {
      const work = normalizeWorkDetail(await api.technician.works.detail(this.workId));
      work.tags = work.tags ? (typeof work.tags === 'string' ? JSON.parse(work.tags) : work.tags) : [];
      const imageUrls = work.images ? (typeof work.images === 'string' ? JSON.parse(work.images) : work.images) : [];
      if (imageUrls.length === 0 && work.coverUrl) imageUrls.push(work.coverUrl);

      this.setData({ work, imageUrls, loading: false, loadFailed: false });
      this.prepareSharePath();
      this.loadComments();
    } catch (err) {
      this.setData({ loading: false, loadFailed: true, loadErrorText: '作品暂时无法加载', canRetryLoad: true });
    } finally {
      this._loadingWork = false;
    }
  },

  async loadComments() {
    try {
      const res = await api.technician.works.getComments(this.workId);
      const comments = (res || []).map(processComment);
      const visibleComments = comments.filter(c => !c.isHidden);
      const hiddenComments = comments.filter(c => c.isHidden);
      this.setData({ comments, visibleComments, hiddenComments });
    } catch (err) {
      console.error('loadComments error:', err);
    }
  },

  async prepareSharePath() {
    if (this._sharePreparing) return;
    const work = this.data.work || {};
    const canSharePublicly = work.publicationStatus === 'approved'
      && work.isVisible !== false
      && work.visibilityScope === 'public'
      && !work.archivedAt;
    if (!canSharePublicly) {
      this.setData({ sharePath: '' });
      wx.hideShareMenu();
      return;
    }
    this._sharePreparing = true;
    try {
      // 服务端确认该作品当前可公开访问，不能把私密作品按普通 ID 分享。
      await api.public.works.detail(this.workId);
      this.setData({ sharePath: '/pages/client/public-work/index?id=' + this.workId });
      wx.showShareMenu({ menus: ['shareAppMessage'] });
    } catch (err) {
      this.setData({ sharePath: '' });
    } finally {
      this._sharePreparing = false;
    }
  },

  onShareAppMessage() {
    if (!this.data.sharePath) return { title: '美甲作品', path: '/pages/client/works/index' };
    return {
      title: this.data.work.title || '美甲作品',
      path: this.data.sharePath,
      imageUrl: this.data.imageUrls[0] || ''
    };
  },

  manageComment(e) {
    const comment = e.detail.comment;
    if (!comment || !comment.id) return;
    wx.showActionSheet({
      itemList: [comment.isPinned ? '取消置顶' : '置顶评论', comment.isHidden ? '显示评论' : '隐藏评论', '删除评论'],
      success: async (result) => {
        if (result.tapIndex === 2) return this.confirmDeleteComment(comment);
        try {
          if (result.tapIndex === 0) await api.technician.works.pinComment(this.workId, comment.id);
          if (result.tapIndex === 1) await api.technician.works.hideComment(this.workId, comment.id);
          wx.showToast({ title: result.tapIndex === 0 ? '评论置顶状态已更新' : '评论显示状态已更新', icon: 'none' });
          await this.loadComments();
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  },

  confirmDeleteComment(comment) {
    wx.showModal({
      title: '删除评论',
      content: '删除后无法恢复，确定继续吗？',
      confirmText: '删除',
      confirmColor: uiColors.danger,
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await api.technician.works.deleteComment(this.workId, comment.id);
          wx.showToast({ title: '评论已删除', icon: 'success' });
          await this.loadComments();
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  },

  goBack() {
    wx.navigateBack();
  },

  editWork() {
    if (!this.workId) return;
    wx.navigateTo({ url: `/pages/technician/work-edit/index?id=${this.workId}` });
  },

  showWorkActions(e) {
    const source = e.detail || {};
    const { id, visible, pinned, featured, heroSlot } = source;
    if (!id) return;
    wx.showActionSheet({
      itemList: [
        visible ? '隐藏作品' : '显示作品',
        pinned ? '取消作品置顶' : '置顶作品',
        featured ? '移出主页精选' : '加入主页精选',
        heroSlot ? '取消客户首页推荐' : '推荐至客户首页',
        '编辑作品',
        '删除作品'
      ],
      success: async (res) => {
        try {
          if (res.tapIndex === 3) return wx.navigateTo({ url: '/pages/technician/hero-recommendations/index?' + (heroSlot ? 'removeWorkId=' : 'workId=') + id });
          if (res.tapIndex === 0) await api.technician.works.toggleVisible(id);
          if (res.tapIndex === 1) await api.technician.works.togglePinned(id);
          if (res.tapIndex === 2) await api.technician.works.toggleFeatured(id);
          if (res.tapIndex === 4) return this.editWork();
          if (res.tapIndex === 5) return this.confirmDeleteWork(id);
          const messages = [visible ? '作品已隐藏' : '作品已显示', pinned ? '已取消作品置顶' : '作品已置顶', featured ? '已移出主页精选' : '已加入主页精选'];
          wx.showToast({ title: messages[res.tapIndex], icon: 'success' });
          this.loadWork();
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  },

  confirmDeleteWork(id) {
    wx.showModal({
      title: '删除作品',
      content: '确定删除这个作品吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: uiColors.danger,
      success: (res) => { if (res.confirm) this.deleteWork(id); }
    });
  },

  async deleteWork(id) {
    try {
      wx.showLoading({ title: '删除中...' });
      await api.technician.works.delete(id);
      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 400);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '删除失败', icon: 'none' });
    }
  },

  onImageScroll(e) {
    const scrollLeft = e.detail.scrollLeft;
    const width = e.detail.scrollWidth / this.data.imageUrls.length;
    const index = Math.round(scrollLeft / width);
    if (index !== this.data.currentImageIndex) {
      this.setData({ currentImageIndex: index });
    }
  },

  openViewer(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ viewerOpen: true, viewerIndex: index });
  },

  closeViewer() {
    this.setData({ viewerOpen: false });
  },

  onViewerSwiperChange(e) {
    const index = e.detail.current;
    if (index !== this.data.viewerIndex) {
      this.setData({ viewerIndex: index, currentImageIndex: index });
    }
  },

  replyComment(e) {
    const comment = e.currentTarget.dataset.comment;
    if (comment && comment.id) {
      this.setData({ replyingTo: { id: comment.id, name: comment.user.name } });
    }
  },

  cancelReply() {
    this.setData({ replyingTo: null });
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  onSharedCommentInput(e) { this.setData({ commentText: e.detail.value }); },

  onSharedCommentReply(e) {
    const comment = e.detail.comment;
    if (comment && comment.id) this.setData({ replyingTo: { id: comment.id, name: comment.user.name } });
  },

  async submitComment() {
    if (this.data.submittingComment) return;
    const { commentText, replyingTo } = this.data;
    if (!commentText.trim()) return;
    this.setData({ submittingComment: true });
    try {
      const data = { content: commentText.trim() };
      if (replyingTo) data.parentId = replyingTo.id;
      await api.technician.works.addComment(this.workId, data);
      if (this.data.commentText === commentText && (this.data.replyingTo || {}).id === (replyingTo || {}).id) {
        this.setData({ commentText: '', replyingTo: null });
      }
      wx.showToast({ title: replyingTo ? '回复已发布' : '评论已发布', icon: 'success' });
      await this.loadComments();
      this.loadWork();
    } catch (err) {
      wx.showToast({ title: '评论失败', icon: 'none' });
    } finally {
      this.setData({ submittingComment: false });
    }
  },

  async toggleLike() {
    if (this.data.socialLoading) return;
    this.setData({ socialLoading: true });
    try {
      const res = await api.technician.works.like(this.workId);
      const work = { ...this.data.work };
      work.isLiked = res.liked;
      work.likeCount = Math.max(0, (work.likeCount || 0) + (res.liked ? 1 : -1));
      this.setData({ work });
      wx.showToast({ title: res.liked ? '点赞成功' : '去掉点赞成功', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      this.setData({ socialLoading: false });
    }
  },

  async toggleFavorite() {
    if (this.data.socialLoading) return;
    this.setData({ socialLoading: true });
    try {
      const res = await api.technician.works.favorite(this.workId);
      const work = { ...this.data.work };
      work.isFavorited = res.favorited;
      work.favoriteCount = Math.max(0, (work.favoriteCount || 0) + (res.favorited ? 1 : -1));
      this.setData({ work });
      wx.showToast({ title: res.favorited ? '收藏成功' : '取消收藏成功', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      this.setData({ socialLoading: false });
    }
  },

  focusComment() {
    this.setData({ commentFocused: true });
  },

  toggleHiddenComments() {
    this.setData({ showHidden: !this.data.showHidden });
  }
});
