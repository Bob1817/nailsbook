const api = require('../../../services/api');
const labels = { follow: '关注', like: '点赞', favorite: '收藏' };
Page({
  data: { type: 'follow', label: '关注', list: [], loading: false, error: '', hasMore: false },
  onLoad(options) {
    if (wx.getStorageSync('role') !== 'technician') {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }
    const type = labels[options.type] ? options.type : 'follow';
    this.setData({ type, label: labels[type] });
    this.loadRecords(true);
  },
  onPullDownRefresh() { this.loadRecords(true).finally(() => wx.stopPullDownRefresh()); },
  onReachBottom() { if (this.data.hasMore) this.loadRecords(false); },
  retry() { this.loadRecords(!this.data.list.length); },
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
  viewWork(e) {
    wx.navigateTo({ url: '/pages/technician/work-detail/index?id=' + e.currentTarget.dataset.id });
  },
});
