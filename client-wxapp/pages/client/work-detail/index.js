const api = require('../../../services/api');
const { formatTime } = require('../../../utils/util');

Page({
  data: {
    work: {},
    comments: [],
    techAvatar: '',
    techName: '',
    techCity: ''
  },

  onLoad(options) {
    this.loadWork(options.id);
  },

  async loadWork(id) {
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await api.client.works.detail(id);
      
      // 预处理数据
      res.tags = res.tags ? (typeof res.tags === 'string' ? JSON.parse(res.tags) : res.tags) : [];
      res.images = res.images ? (typeof res.images === 'string' ? JSON.parse(res.images) : res.images) : [res.coverUrl];
      
      // 提取美甲师信息
      const techAvatar = res.technician && res.technician.avatarUrl;
      const techName = res.technician && res.technician.name;
      const techCity = res.technician && res.technician.city;

      this.setData({ work: res, techAvatar, techName, techCity });
      wx.hideLoading();

      this.loadComments(id);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadComments(workId) {
    try {
      const res = await api.client.works.comments(workId);
      const comments = (res.list || res.data || []).map(c => ({
        ...c,
        createdAt: formatTime(c.createdAt),
        userAvatar: c.user && c.user.avatarUrl,
        userName: c.user && c.user.name
      }));
      this.setData({ comments });
    } catch (err) {
      console.error('loadComments error:', err);
    }
  },

  async toggleLike() {
    const { work } = this.data;
    try {
      if (work.isLiked) {
        await api.client.works.unlike(work.id);
        work.isLiked = false;
        work.likes = (work.likes || 1) - 1;
      } else {
        await api.client.works.like(work.id);
        work.isLiked = true;
        work.likes = (work.likes || 0) + 1;
      }
      this.setData({ work });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async toggleFavorite() {
    const { work } = this.data;
    try {
      if (work.isFavorited) {
        await api.client.works.unfavorite(work.id);
        work.isFavorited = false;
        work.favorites = (work.favorites || 1) - 1;
      } else {
        await api.client.works.favorite(work.id);
        work.isFavorited = true;
        work.favorites = (work.favorites || 0) + 1;
      }
      this.setData({ work });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  contactTech() {
    const { work } = this.data;
    wx.navigateTo({
      url: `/pages/client/chat/index?techId=${work.techId}`
    });
  }
});
