const request = require('../../utils/request');
const STATUS = { pending: '等待审核', rejected: '未通过审核', cancelled: '已撤回', completed: '已注销' };
Page({
  data: { roleLabel: '', loading: true, error: '', record: null, statusText: '', blockers: [], reason: '', confirmed: false, busy: false },
  onLoad() {
    const role = getApp().globalData.role || wx.getStorageSync('role');
    if (!['client', 'technician'].includes(role)) { wx.reLaunch({ url: '/pages/login/index' }); return; }
    this._url = '/api/' + role + '/account-deletion';
    this.setData({ roleLabel: role === 'client' ? '客户' : '美甲师' });
    this.load();
  },
  async load() {
    if (!this._url) return;
    this.setData({ loading: true, error: '' });
    try {
      const result = await request.get(this._url);
      const record = result.request ? { ...result.request, requestedAtText: new Date(result.request.requestedAt).toLocaleString(), processedAtText: result.request.processedAt ? new Date(result.request.processedAt).toLocaleString() : '' } : null;
      this.setData({ record, statusText: STATUS[result.request?.status] || '', blockers: result.blockers || [] });
    } catch (e) { this.setData({ error: e.message || '加载失败，请重试' }); }
    finally { this.setData({ loading: false }); }
  },
  onReason(e) { this.setData({ reason: e.detail.value }); },
  onConfirm(e) { this.setData({ confirmed: e.detail.value.includes('confirmed') }); },
  async submit() {
    if (this.data.busy || this.data.loading || this.data.error || this.data.blockers.length || !this.data.confirmed) return;
    const reason = this.data.reason.trim();
    if (!reason) { wx.showToast({ title: '请填写注销原因', icon: 'none' }); return; }
    this.setData({ busy: true });
    try {
      await request.post(this._url, { reason, confirmed: true });
      this.setData({ reason: '', confirmed: false });
      await this.load();
    } catch (e) { wx.showModal({ title: '申请未提交', content: e.message || '请稍后重试', showCancel: false }); }
    finally { this.setData({ busy: false }); }
  },
  async cancel() {
    if (this.data.busy) return;
    const result = await wx.showModal({ title: '撤回注销申请', content: '撤回后可以继续使用账号。', confirmText: '确认撤回' });
    if (!result.confirm) return;
    this.setData({ busy: true });
    try { await request.post(this._url + '/cancel'); await this.load(); }
    catch (e) { wx.showModal({ title: '撤回失败', content: e.message || '请刷新后重试', showCancel: false }); }
    finally { this.setData({ busy: false }); }
  }
});
