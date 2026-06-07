const api = require('../../../services/api');

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
    techAvatar: '',
    techName: '',
    techCity: ''
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

  // 预约同款：以该作品作为预约服务内容，跳转创建预约
  bookSameStyle: function () {
    var work = this.data.work;
    if (!work || !work.id) return;
    if (!work.technicianId) {
      wx.showToast({ title: '暂无法获取美甲师信息', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/client/create-order/index?workId=' + work.id });
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
