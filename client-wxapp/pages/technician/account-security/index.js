const api = require('../../../services/api');

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    saving: false
  },

  onOldInput(e) { this.setData({ oldPassword: e.detail.value }); },
  onNewInput(e) { this.setData({ newPassword: e.detail.value }); },
  onConfirmInput(e) { this.setData({ confirmPassword: e.detail.value }); },

  async changePassword() {
    const { oldPassword, newPassword, confirmPassword, saving } = this.data;
    if (saving) return;
    if (!oldPassword) { wx.showToast({ title: '请输入原密码', icon: 'none' }); return; }
    if (!newPassword || newPassword.length < 6) { wx.showToast({ title: '新密码至少6位', icon: 'none' }); return; }
    if (newPassword !== confirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return; }

    this.setData({ saving: true });
    wx.showLoading({ title: '修改中...' });

    try {
      await api.technician.auth.changePassword(oldPassword, newPassword);
      wx.hideLoading();
      wx.showToast({ title: '修改成功', icon: 'success' });
      this.setData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '修改失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
