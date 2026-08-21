const api = require('../../../services/api');

let countdownTimer = null;

Page({
  data: {
    phone: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    countdown: 0,
    sending: false,
    submitting: false
  },

  onUnload() {
    if (countdownTimer) clearInterval(countdownTimer);
  },

  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onCodeInput(e) { this.setData({ code: e.detail.value }); },
  onNewPasswordInput(e) { this.setData({ newPassword: e.detail.value }); },
  onConfirmPasswordInput(e) { this.setData({ confirmPassword: e.detail.value }); },

  async handleSendCode() {
    const { phone, sending } = this.data;
    if (sending) return;
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    this.setData({ sending: true });
    try {
      await api.auth.sendResetCode(phone, 'client');
      wx.showToast({ title: '验证码已发送', icon: 'success' });
      this.setData({ countdown: 60 });
      countdownTimer = setInterval(() => {
        const c = this.data.countdown - 1;
        if (c <= 0) {
          clearInterval(countdownTimer);
          countdownTimer = null;
          this.setData({ countdown: 0 });
        } else {
          this.setData({ countdown: c });
        }
      }, 1000);
    } catch (err) {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    } finally {
      this.setData({ sending: false });
    }
  },

  async handleSubmit() {
    const { phone, code, newPassword, confirmPassword, submitting } = this.data;
    if (submitting) return;

    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return;
    }
    if (!code.trim()) {
      wx.showToast({ title: '请输入验证码', icon: 'none' }); return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      wx.showToast({ title: '密码至少8位，含字母和数字', icon: 'none' }); return;
    }
    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' }); return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      await api.auth.resetPassword(phone, code.trim(), newPassword, 'client');
      wx.hideLoading();
      wx.showModal({
        title: '重置成功',
        content: '密码已重置，请使用新密码登录',
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
