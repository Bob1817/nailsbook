const api = require('../../../services/api');

Page({
  data: { phone: '', newPassword: '', confirmPassword: '', submitting: false },

  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onNewPasswordInput(e) { this.setData({ newPassword: e.detail.value }); },
  onConfirmPasswordInput(e) { this.setData({ confirmPassword: e.detail.value }); },

  async handleSubmit() {
    const { phone, newPassword, confirmPassword, submitting } = this.data;
    if (submitting) return;
    if (!phone || phone.length !== 11) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return; }
    if (!newPassword || newPassword.length < 6) { wx.showToast({ title: '密码至少6位', icon: 'none' }); return; }
    if (newPassword !== confirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return; }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      await api.auth.resetPassword(phone, newPassword, 'technician');
      wx.hideLoading();
      wx.showModal({
        title: '重置成功', content: '密码已重置，请使用新密码登录',
        showCancel: false,
        success: () => wx.navigateBack()
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '重置失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
