const api = require('../../../services/api');

// 面板拖拽范围（rpx）
var PANEL_COLLAPSED = 0;       // 初始位置
var PANEL_EXPANDED = -520;     // 上滑展开最大偏移

function formatTime(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var now = new Date();
  var diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return m + '月' + day + '日';
}

function processComment(c) {
  return {
    ...c,
    createdAtText: formatTime(c.createdAt),
    userAvatar: c.user && c.user.avatarUrl,
    userName: c.user && c.user.name,
    userRole: c.user && c.user.role,
    replies: (c.replies || []).map(processComment)
  };
}

Page({
  data: {
    work: {},
    imageUrls: [],
    comments: [],
    loading: true,
    currentImageIndex: 0,
    viewerOpen: false,
    viewerIndex: 0,
    commentText: '',
    replyingTo: null,
    panelOffset: 0,
    isDragging: false,
    techAvatar: '',
    techName: '',
    techCity: ''
  },

  // ── 面板拖拽手势 ──────────────────────────

  onDragStart: function (e) {
    this._dragStartY = e.touches[0].clientY;
    this._dragStartOffset = this.data.panelOffset;
    this.setData({ isDragging: true });
  },

  onDragMove: function (e) {
    if (!this._dragStartY) return;
    var deltaY = e.touches[0].clientY - this._dragStartY;
    var deltaRpx = deltaY * 2;
    var newOffset = this._dragStartOffset + deltaRpx;
    if (newOffset > PANEL_COLLAPSED) newOffset = PANEL_COLLAPSED;
    if (newOffset < PANEL_EXPANDED) newOffset = PANEL_EXPANDED;
    this.setData({ panelOffset: newOffset });
  },

  onDragEnd: function () {
    var current = this.data.panelOffset;
    var mid = (PANEL_COLLAPSED + PANEL_EXPANDED) / 2;
    var expanded = current < mid;
    this.setData({
      isDragging: false,
      panelOffset: expanded ? PANEL_EXPANDED : PANEL_COLLAPSED
    });
    this._dragStartY = null;
  },

  onLoad: function (options) {
    if (options.id) {
      this.workId = parseInt(options.id);
      this.loadWork();
    }
  },

  onShow: function () {
    if (this.workId && !this._loaded) {
      this.loadWork();
    }
  },

  loadWork: function () {
    var self = this;
    self.setData({ loading: true });
    api.client.works.detail(self.workId).then(function (work) {
      work.tags = work.tags ? (typeof work.tags === 'string' ? JSON.parse(work.tags) : work.tags) : [];
      var imageUrls = work.images ? (typeof work.images === 'string' ? JSON.parse(work.images) : work.images) : [];
      if (imageUrls.length === 0 && work.coverUrl) imageUrls.push(work.coverUrl);

      // API 返回扁平字段：technicianName, technicianAvatarUrl, technicianId
      var techName = work.technicianName || '';
      var techAvatar = work.technicianAvatarUrl || '';

      self._loaded = true;
      self.setData({
        work: work,
        imageUrls: imageUrls,
        techName: techName,
        techAvatar: techAvatar,
        loading: false
      });
      self.loadComments();
    }).catch(function () {
      self.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  loadComments: function () {
    var self = this;
    api.client.works.comments(self.workId).then(function (res) {
      var comments = (res || []).map(processComment);
      self.setData({ comments: comments });
    }).catch(function (err) {
      console.error('loadComments error:', err);
    });
  },

  // ── 导航 ──────────────────────────────────

  goBack: function () {
    wx.navigateBack();
  },

  contactTech: function () {
    var work = this.data.work;
    if (work.technicianId) {
      wx.navigateTo({ url: '/pages/client/chat-detail/index?techId=' + work.technicianId });
    }
  },

  // ── 图片轮播 ──────────────────────────────

  onImageSwiperChange: function (e) {
    var index = e.detail.current;
    if (index !== this.data.currentImageIndex) {
      this.setData({ currentImageIndex: index });
    }
  },

  openViewer: function (e) {
    var index = e.currentTarget.dataset.index;
    this.setData({ viewerOpen: true, viewerIndex: index });
  },

  closeViewer: function () {
    this.setData({ viewerOpen: false });
  },

  onViewerSwiperChange: function (e) {
    var index = e.detail.current;
    if (index !== this.data.viewerIndex) {
      this.setData({ viewerIndex: index, currentImageIndex: index });
    }
  },

  // ── 点赞 / 收藏 ──────────────────────────

  toggleLike: function () {
    var self = this;
    var work = self.data.work;
    api.client.works.like(work.id).then(function (res) {
      work.isLiked = res.liked;
      work.likeCount = (work.likeCount || 0) + (res.liked ? 1 : -1);
      self.setData({ work: work });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    });
  },

  toggleFavorite: function () {
    var self = this;
    var work = self.data.work;
    api.client.works.favorite(work.id).then(function (res) {
      work.isFavorited = res.favorited;
      self.setData({ work: work });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    });
  },

  // ── 评论 ──────────────────────────────────

  onTapComment: function (e) {
    var item = e.currentTarget.dataset.item;
    if (item && item.id) {
      this.setData({
        replyingTo: { id: item.id, name: item.userName || '匿名用户' }
      });
    }
  },

  cancelReply: function () {
    this.setData({ replyingTo: null });
  },

  onCommentInput: function (e) {
    this.setData({ commentText: e.detail.value });
  },

  submitComment: function () {
    var self = this;
    var commentText = self.data.commentText;
    var replyingTo = self.data.replyingTo;
    if (!commentText.trim()) return;

    var payload = { content: commentText.trim() };
    if (replyingTo) payload.parentId = replyingTo.id;

    api.client.works.addComment(self.workId, payload).then(function () {
      self.setData({ commentText: '', replyingTo: null });
      wx.showToast({ title: '评论已发布', icon: 'success' });
      self.loadComments();
    }).catch(function () {
      wx.showToast({ title: '评论失败', icon: 'none' });
    });
  }
});
