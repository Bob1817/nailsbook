const api = require('../../../services/api');

Page({
  data: { applications: [], loading: true, loadFailed: false, processingId: null },

  onLoad() { this.loadApplications(); },
  onPullDownRefresh() {
    this.loadApplications().finally(() => wx.stopPullDownRefresh());
  },

  async loadApplications() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const result = await api.technician.auth.bindingApplications();
      const applications = (Array.isArray(result) ? result : (result.items || [])).map(item => ({
        ...item,
        initial: String(item.name || '客').charAt(0)
      }));
      this.setData({ applications });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  approve(e) {
    const id = Number(e.currentTarget.dataset.id);
    const name = e.currentTarget.dataset.name || '该客户';
    wx.showModal({
      title: '通过绑定申请',
      content: `确认将${name}添加为你的客户吗？`,
      confirmText: '确认通过',
      success: (result) => { if (result.confirm) this.submit(id, 'approve'); }
    });
  },

  reject(e) {
    const id = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: '拒绝绑定申请',
      content: '可填写拒绝原因',
      editable: true,
      placeholderText: '原因（选填）',
      confirmText: '确认拒绝',
      confirmColor: '#b42318',
      success: (result) => {
        if (result.confirm) this.submit(id, 'reject', result.content || '');
      }
    });
  },

  async submit(id, action, reason) {
    if (this.data.processingId) return;
    this.setData({ processingId: id });
    try {
      if (action === 'approve') await api.technician.auth.approveBinding(id);
      else await api.technician.auth.rejectBinding(id, reason);
      wx.showToast({ title: action === 'approve' ? '已通过' : '已拒绝', icon: 'success' });
      this.setData({ applications: this.data.applications.filter(item => item.id !== id) });
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ processingId: null });
    }
  }
});
