const api = require('../../../services/api');
const { normalizeWorkDetail } = require('../../../utils/normalize-work');

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
  var userName = c.user && c.user.name;
  return {
    ...c,
    createdAtText: formatTime(c.createdAt),
    userAvatar: c.user && c.user.avatarUrl,
    userName: userName,
    userInitial: (userName || '用').charAt(0),
    userRole: c.user && c.user.role,
    replies: (c.replies || []).map(processComment)
  };
}

Page({
  data: {
    work: {},
    imageUrls: [],
    comments: [],
    commentsLoading: false,
    commentsFailed: false,
    submittingComment: false,
    liking: false,
    favoriting: false,
    loading: true,
    loadFailed: false,
    loadErrorText: '',
    canRetryLoad: false,
    currentImageIndex: 0,
    commentText: '',
    commentFocused: false,
    replyingTo: null,
    techAvatar: '',
    techName: '',
    permissions: { canView: true, canShare: true, canFavorite: true, canLike: true, canComment: true },
    sharePath: ''
  },

  onLoad: function (options) {
    this.focusCommentsOnLoad = options.focus === 'comments';
    if (options.id) {
      this.workId = parseInt(options.id);
      this.loadWork();
    } else {
      this.setData({ loading: false, loadFailed: true, loadErrorText: '作品参数无效', canRetryLoad: false });
    }
  },

  onShow: function () {
    if (this.workId && !this._loaded) {
      this.loadWork();
    }
  },

  loadWork: function () {
    if (this._loadingWork || !this.workId) return;
    var self = this;
    self._loadingWork = true;
    self.setData({ sharePath: '' });
    wx.hideShareMenu();
    self.setData({ loading: true, loadFailed: false, loadErrorText: '', canRetryLoad: false });
    api.client.works.detail(self.workId).then(function (rawWork) {
      var work = normalizeWorkDetail(rawWork);
      work.tags = work.tags ? (typeof work.tags === 'string' ? JSON.parse(work.tags) : work.tags) : [];
      var imageUrls = work.images ? (typeof work.images === 'string' ? JSON.parse(work.images) : work.images) : [];
      if (imageUrls.length === 0 && work.coverUrl) imageUrls.push(work.coverUrl);

      var techName = work.technicianName || '';
      var techAvatar = work.technicianAvatarUrl || '';

      self._loaded = true;
      self.setData({
        work: work,
        imageUrls: imageUrls,
        techName: techName,
        techAvatar: techAvatar,
        loading: false,
        loadFailed: false,
        permissions: work.permissions || { canView: true, canShare: true, canFavorite: true, canLike: true, canComment: true }
      });
      self.prepareSharePath();
      self.loadComments();
      if (self.focusCommentsOnLoad) setTimeout(function () { self.focusComment(); }, 120);
    }).catch(function () {
      self.setData({ loading: false, loadFailed: true, loadErrorText: '作品暂时无法加载', canRetryLoad: true });
    }).finally(function () {
      self._loadingWork = false;
    });
  },

  loadComments: function () {
    var self = this;
    self.setData({ commentsLoading: true, commentsFailed: false });
    api.client.works.comments(self.workId).then(function (res) {
      var comments = (res || []).map(processComment);
      self.setData({ comments: comments, commentsLoading: false });
    }).catch(function (err) {
      console.error('loadComments error:', err);
      self.setData({ commentsLoading: false, commentsFailed: true });
    });
  },

  // ── 导航 ──────────────────────────────────

  goBack: function () {
    wx.navigateBack();
  },

  viewArtist: function () {
    var work = this.data.work || {};
    var technicianId = work.technicianId || (work.technician && work.technician.id);
    if (technicianId) wx.navigateTo({ url: '/pages/client/artist-home/index?id=' + technicianId });
  },

  viewCommentArtist: function (e) {
    if (e.currentTarget.dataset.role === 'technician') this.viewArtist();
  },

  // 预约同款
  bookSameStyle: function () {
    var work = this.data.work;
    if (!work || !work.id) return;
    var technicianId = work.technicianId || (work.technician && work.technician.id);
    if (!technicianId) {
      wx.showToast({ title: '暂无法获取美甲师信息', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/client/create-order/index?workId=' + work.id + '&techId=' + technicianId });
  },

  onShareAppMessage: function () {
    var work = this.data.work || {};
    if (!this.data.sharePath) return { title: '美甲作品', path: '/pages/client/works/index' };
    if (work.id) api.client.works.recordShare(work.id, 'wechat_friend').catch(function () {});
    return {
      title: '我的美甲灵感｜' + (work.title || 'LunaNails 私人美甲'),
      path: this.data.sharePath,
      imageUrl: this.data.imageUrls[0] || ''
    };
  },

  prepareSharePath: function () {
    if (this._sharePreparing) return;
    this.setData({ sharePath: '' });
    wx.hideShareMenu();
    if (!this.data.permissions.canShare) return;
    this._sharePreparing = true;
    return api.client.works.createShareGrant(this.workId).then((grant) => {
      if (!grant.public && !/^[a-f0-9]{48}$/.test(grant.token || '')) throw new Error('分享授权无效');
      const path = grant.public
        ? '/pages/client/public-work/index?id=' + this.workId
        : '/pages/client/public-work/index?shareToken=' + grant.token;
      this.setData({ sharePath: path });
      wx.showShareMenu({ menus: ['shareAppMessage'] });
    }).catch(() => this.setData({ sharePath: '' })).finally(() => { this._sharePreparing = false; });
  },

  // ── 图片轮播 / 预览 ──────────────────────

  onImageSwiperChange: function (e) {
    var index = e.detail.current;
    if (index !== this.data.currentImageIndex) {
      this.setData({ currentImageIndex: index });
    }
  },

  previewImage: function (e) {
    var url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.imageUrls
    });
  },

  // ── 点赞 / 收藏 ──────────────────────────

  toggleLike: function () {
    if (this.data.liking) return;
    var self = this;
    var work = self.data.work;
    self.setData({ liking: true });
    api.client.works.like(work.id).then(function (res) {
      work.isLiked = res.liked;
      work.likeCount = Math.max(0, (work.likeCount || 0) + (res.liked ? 1 : -1));
      self.setData({ work: work });
      wx.showToast({ title: res.liked ? '点赞成功' : '去掉点赞成功', icon: 'none' });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }).finally(function () { self.setData({ liking: false }); });
  },

  toggleFavorite: function () {
    if (this.data.favoriting) return;
    var self = this;
    var work = self.data.work;
    self.setData({ favoriting: true });
    api.client.works.favorite(work.id).then(function (res) {
      work.isFavorited = res.favorited;
      work.favoriteCount = Math.max(0, (work.favoriteCount || 0) + (res.favorited ? 1 : -1));
      self.setData({ work: work });
      wx.showToast({ title: res.favorited ? '收藏成功' : '取消收藏成功', icon: 'none' });
    }).catch(function (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }).finally(function () { self.setData({ favoriting: false }); });
  },

  // ── 评论 ──────────────────────────────────

  focusComment: function () {
    this.setData({ commentFocused: true });
    wx.pageScrollTo({ selector: '#work-comments', duration: 280 });
  },

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

  onSharedCommentInput: function (e) { this.setData({ commentText: e.detail.value }); },

  onSharedCommentReply: function (e) {
    var item = e.detail.comment;
    if (item && item.id) this.setData({ replyingTo: { id: item.id, name: item.userName || (item.user && item.user.name) || '匿名用户' } });
  },

  submitComment: function () {
    if (this.data.submittingComment) return;
    var self = this;
    var commentText = self.data.commentText;
    var replyingTo = self.data.replyingTo;
    if (!commentText.trim()) return;

    var payload = { content: commentText.trim() };
    if (replyingTo) payload.parentId = replyingTo.id;

    self.setData({ submittingComment: true });
    api.client.works.addComment(self.workId, payload).then(function () {
      if (self.data.commentText === commentText && (self.data.replyingTo || {}).id === (replyingTo || {}).id) {
        self.setData({ commentText: '', replyingTo: null });
      }
      wx.showToast({ title: '评论已发布', icon: 'success' });
      self.loadComments();
    }).catch(function (err) {
      wx.showToast({ title: (err && err.message) || '评论失败，请重试', icon: 'none' });
    }).finally(function () { self.setData({ submittingComment: false }); });
  }
});
