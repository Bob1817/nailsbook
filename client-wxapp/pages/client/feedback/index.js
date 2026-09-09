const api = require('../../../services/api');
const TYPES = ['功能建议', '使用问题', '预约相关', '账号问题', '其他'];
const STATUS = {
  pending: { text: '待处理', className: 'pending' },
  processing: { text: '处理中', className: 'processing' },
  resolved: { text: '已回复', className: 'resolved' }
};
function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
function normalize(item) {
  const status = STATUS[item.status] || STATUS.pending;
  return { ...item, statusText: status.text, statusClass: status.className, dateText: formatDate(item.createdAt), replyDateText: formatDate(item.repliedAt) };
}
Page({
  data: {
    list: [], loading: true, loadError: false, showCreate: false, selected: null,
    types: TYPES, typeIndex: 0, title: '', content: '', titleMax: 30, contentMax: 500, submitting: false
  },
  onLoad(options) {
    if (options && options.action === 'account-deletion') {
      wx.redirectTo({ url: '/pages/account-deletion/index' });
      return;
    }
    this.load();
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  async load() {
    this.setData({ loading: true, loadError: false });
    try {
      const result = await api.client.feedback.list();
      this.setData({ list: (result.list || []).map(normalize), loading: false });
    } catch (err) {
      this.setData({ loading: false, loadError: true });
    }
  },
  openCreate() { this.setData({ showCreate: true }); },
  closeCreate() { if (!this.data.submitting) this.setData({ showCreate: false }); },
  stopBubble() {},
  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onTypeChange(e) { this.setData({ typeIndex: Number(e.detail.value) }); },
  async openDetail(e) {
    const id = e.currentTarget.dataset.id;
    const cached = this.data.list.find((item) => String(item.id) === String(id));
    this.setData({ selected: cached || null });
    try {
      const detail = await api.client.feedback.detail(id);
      this.setData({ selected: normalize(detail) });
    } catch (err) {}
  },
  closeDetail() { this.setData({ selected: null }); },
  async submit() {
    if (this.data.submitting) return;
    const title = this.data.title.trim();
    const content = this.data.content.trim();
    if (!title || !content) {
      wx.showToast({ title: !title ? '请输入问题标题' : '请输入问题内容', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await api.client.feedback.create({ title, type: TYPES[this.data.typeIndex], content });
      this.setData({ showCreate: false, title: '', content: '', typeIndex: 0, submitting: false });
      wx.showToast({ title: '反馈已提交', icon: 'success' });
      await this.load();
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
    }
  }
});
