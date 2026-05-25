const api = require('../../../services/api');
const { validatePhone } = require('../../../utils/util');

Page({
  data: {
    phone: '',
    code: '',
    inviteCode: '',
    mode: 'login', // 'login' | 'register'
    counting: false,
    countText: '获取验证码',
    count: 60,
    loading: false
  },

  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onCodeInput(e) { this.setData({ code: e.detail.value }); },
  onInviteCodeInput(e) { this.setData({ inviteCode: e.detail.value }); },

  switchToRegister() {
    this.setData({ mode: 'register', code: '', countText: '获取验证码', counting: false });
  },

  switchToLogin() {
    this.setData({ mode: 'login', code: '', inviteCode: '', countText: '获取验证码', counting: false });
  },

  async sendCode() {
    const { phone, counting, mode, inviteCode } = this.data;
    if (counting) return;

    if (!validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    if (mode === 'register' && !inviteCode.trim()) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发送中...' });
    try {
      if (mode === 'login') {
        await api.auth.requestCode(phone, 'client');
      } else {
        await api.auth.requestRegisterCode(phone, inviteCode.trim());
      }
      wx.hideLoading();
      wx.showToast({ title: '验证码已发送', icon: 'success' });
      this._startCountdown();
    } catch (err) {
      wx.hideLoading();
      const msg = err.message || '发送失败';
      if (msg.includes('未注册') || msg.includes('未绑定')) {
        wx.showModal({
          title: '手机号未注册',
          content: '该手机号还未注册，请输入美甲师邀请码完成注册',
          confirmText: '去注册',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) this.switchToRegister();
          }
        });
      } else {
        wx.showToast({ title: msg, icon: 'none' });
      }
    }
  },

  _startCountdown() {
    let count = 60;
    this.setData({ counting: true, countText: `${count}s`, count });
    const timer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timer);
        this.setData({ counting: false, countText: '获取验证码', count: 60 });
      } else {
        this.setData({ countText: `${count}s`, count });
      }
    }, 1000);
  },

  async handleSubmit() {
    const { phone, code, inviteCode, mode, loading } = this.data;
    if (loading) return;

    if (!validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (!code || code.length < 4) {
      wx.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }
    if (mode === 'register' && !inviteCode.trim()) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...' });

    try {
      let res;
      if (mode === 'login') {
        res = await api.auth.login(phone, code, 'client');
      } else {
        res = await api.auth.registerByInvite(phone, code, inviteCode.trim());
      }

      const app = getApp();
      app.setLogin('client', res.accessToken, res.client);

      if (res.refreshToken) {
        wx.setStorageSync('client_refreshToken', res.refreshToken);
      }
      if (res.technician) {
        wx.setStorageSync('client_bindings', res.technicians || [res.technician]);
        wx.setStorageSync('defaultTechId', res.technician.id);
      }

      wx.hideLoading();
      wx.reLaunch({ url: '/pages/client/home/index' });
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '登录失败，请重试', icon: 'none' });
    }
  }
});
