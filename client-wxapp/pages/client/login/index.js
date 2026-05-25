const { validatePhone, validateCode } = require('../../../utils/util');

Page({
  data: {
    phone: '',
    code: '',
    countText: '获取验证码',
    counting: false,
    count: 60
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },

  sendCode() {
    const { phone, counting } = this.data;
    if (counting) return;

    if (!validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    wx.showToast({ title: '验证码功能开发中', icon: 'none' });
  },

  handleSubmit() {
    const { phone, code } = this.data;

    if (!validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (!validateCode(code)) {
      wx.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }

    wx.showToast({ title: '登录功能开发中', icon: 'none' });
  }
});