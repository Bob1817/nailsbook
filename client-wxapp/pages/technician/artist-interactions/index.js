const api = require('../../../services/api');
const labels = { like: '点赞', favorite: '收藏', comment: '评论' };
Page({
  data: { type: 'like', label: '点赞', list: [], loading: false, error: '', hasMore: false },
  onLoad(options) {
    if (wx.getStorageSync('role') !== 'technician') {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }
    const type = labels[options.type] ? options.type : 'like';
    this.setData({ type, label: labels[type] });
    this.loadRecords(true);
  },
  onPullDownRefresh() { this.loadRecords(true).finally(() => wx.stopPullDownRefresh()); },
  onReachBottom() { if (this.data.hasMore) this.loadRecords(false); },
  retry() { this.loadRecords(!this.data.list.length); },
  switchType(e) {
    const type = e.currentTarget.dataset.type;
    if (!labels[type] || type === this.data.type) return;
    this.page = 0;
    this.setData({ type, label: labels[type], list: [], hasMore: false });
    this.loadRecords(true);
  },
  async loadRecords(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.page + 1;
    this.setData({ loading: true, error: '' });
    try {
      const result = await api.technician.artistInteractions({ type: this.data.type, page });
      const list = result.list.map(item => ({ ...item, time: this.formatTime(item.createdAt) }));
      this.page = page;
      this.setData({ list: reset ? list : this.data.list.concat(list), hasMore: result.hasMore });
    } catch (err) {
      this.setData({ error: '记录加载失败，请稍后重试' });
    } finally { this.setData({ loading: false }); }
  },
  formatTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  manageComment(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.list.find(record => Number(record.id) === id);
    if (!item) return;
    wx.showActionSheet({
      itemList: [item.isPinned ? '取消置顶' : '置顶评论', item.isHidden ? '恢复展示' : '隐藏评论', '删除评论'],
      success: ({ tapIndex }) => {
        if (tapIndex === 2) return this.deleteComment(id);
        const action = tapIndex === 0 ? 'pin' : 'hide';
        api.technician.manageArtistComment(id, action).then(() => this.loadRecords(true)).catch(err => {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        });
      }
    });
  },
  deleteComment(id) {
    wx.showModal({
      title: '删除评论',
      content: '删除后无法恢复，确定继续吗？',
      confirmText: '删除',
      success: ({ confirm }) => {
        if (!confirm) return;
        api.technician.deleteArtistComment(id).then(() => {
          this.setData({ list: this.data.list.filter(item => Number(item.id) !== id) });
          wx.showToast({ title: '评论已删除', icon: 'success' });
        }).catch(err => wx.showToast({ title: err.message || '删除失败', icon: 'none' }));
      }
    });
  },
});
