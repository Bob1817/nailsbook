const api = require('../../../services/api');

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
  return {
    ...c,
    createdAtText: formatTime(c.createdAt),
    replies: (c.replies || []).map(processComment)
  };
}

Page({
  data: {
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
    replyingTo: null,
    scrollTarget: ''
  },

  onLoad(options) {
    try {
      const rect = wx.getMenuButtonBoundingClientRect();
      this.setData({ viewerCloseTop: rect.top });
    } catch (e) {}
    if (options.id) {
      this.workId = parseInt(options.id);
      this.loadWork();
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
    this._loadingWork = true;
    this.setData({ loading: true, loadFailed: false, loadErrorText: '', canRetryLoad: false });
    try {
      const work = await api.technician.works.detail(this.workId);
      work.tags = work.tags ? (typeof work.tags === 'string' ? JSON.parse(work.tags) : work.tags) : [];
      const imageUrls = work.images ? (typeof work.images === 'string' ? JSON.parse(work.images) : work.images) : [];
      if (imageUrls.length === 0 && work.coverUrl) imageUrls.push(work.coverUrl);

      this.setData({ work, imageUrls, loading: false, loadFailed: false });
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

  goBack() {
    wx.navigateBack();
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

  async submitComment() {
    const { commentText, replyingTo } = this.data;
    if (!commentText.trim()) return;

    try {
      const data = { content: commentText.trim() };
      if (replyingTo) data.parentId = replyingTo.id;
      await api.technician.works.addComment(this.workId, data);
      this.setData({ commentText: '', replyingTo: null });
      wx.showToast({ title: replyingTo ? '回复已发布' : '评论已发布', icon: 'success' });
      await this.loadComments();
      this.loadWork();
    } catch (err) {
      wx.showToast({ title: '评论失败', icon: 'none' });
    }
  },

  toggleHiddenComments() {
    this.setData({ showHidden: !this.data.showHidden });
  }
});
