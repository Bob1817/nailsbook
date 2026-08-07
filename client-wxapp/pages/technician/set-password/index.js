const api = require('../../../services/api');

function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) return '密码至少 8 位';
  if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
  return null;
}

Page({
  data: {
    phone: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    countdown: 0,
    sending: false,
    loading: false,
    error: ''
  },

  onLoad(options) {
    this.setData({ phone: options.phone || '' });
  },

  onNewPwdInput(e) { this.setData({ newPassword: e.detail.value, error: '' }); },
  onConfirmPwdInput(e) { this.setData({ confirmPassword: e.detail.value, error: '' }); },
  onCodeInput(e) { this.setData({ code: e.detail.value, error: '' }); },

  onUnload() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  },

  async handleSendCode() {
    const { phone, sending, countdown } = this.data;
    if (!phone || sending || countdown > 0) return;
    this.setData({ sending: true, error: '' });
    try {
      await api.technician.auth.sendInitialPasswordCode(phone);
      wx.showToast({ title: '验证码已发送', icon: 'success' });
      this.setData({ countdown: 60 });
      this.countdownTimer = setInterval(() => {
        const next = this.data.countdown - 1;
        if (next <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
        this.setData({ countdown: Math.max(next, 0) });
      }, 1000);
    } catch (err) {
      this.setData({ error: err.message || '验证码发送失败' });
    } finally {
      this.setData({ sending: false });
    }
  },

  async handleSubmit() {
    const { phone, code, newPassword, confirmPassword, loading } = this.data;
    if (loading) return;
    if (phone && !code.trim()) { this.setData({ error: '请输入验证码' }); return; }

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) { this.setData({ error: pwdErr }); return; }
    if (newPassword !== confirmPassword) { this.setData({ error: '两次密码不一致' }); return; }

    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '设置中...' });

    try {
      let res;
      if (phone) {
        // 首次设置密码需要验证发送到预留手机号的短信验证码。
        res = await api.technician.auth.setInitialPassword(phone, code.trim(), newPassword);
      } else {
        // 已登录状态改密
        res = await api.technician.auth.setPassword(newPassword);
      }
      wx.hideLoading();

      // 自动登录
      const app = getApp();
      app.setLogin('technician', res.accessToken, res.technician, undefined, false);
      if (res.refreshToken) wx.setStorageSync('technician_refreshToken', res.refreshToken);

      wx.showToast({ title: '密码设置成功', icon: 'success' });
      setTimeout(() => wx.reLaunch({ url: '/pages/technician/home/index' }), 1200);
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false, error: err.message || '密码设置失败，请重试' });
    }
  }
});
