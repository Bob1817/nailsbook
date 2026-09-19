const api = require('../../../services/api');
const privacy = require('../../../utils/privacy');

Page({
  data: {
    phone: '', newPassword: '', confirmPassword: '',
    submitting: false, wechatChecking: true, wechatAvailable: false
  },

  onLoad(options) {
    if (options && options.phone) {
      this.setData({ phone: options.phone });
    }
    this._loadCapabilities();
  },

  async _loadCapabilities() {
    const app = getApp();
    const capabilities = await app.loadCapabilities();
    this.setData({
      wechatAvailable: !!capabilities.wechatLogin,
      wechatChecking: false
    });
  },

  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onNewPasswordInput(e) { this.setData({ newPassword: e.detail.value }); },
  onConfirmPasswordInput(e) { this.setData({ confirmPassword: e.detail.value }); },

  _validate() {
    const { phone, newPassword, confirmPassword } = this.data;
    if (!/^1\d{10}$/.test(phone)) return '请输入正确的手机号';
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return '密码至少8位，含字母和数字';
    if (newPassword !== confirmPassword) return '两次密码不一致';
    return '';
  },

  // 微信手机号授权重置：项目未接入短信服务，以微信授权验证手机号归属
  async onWechatPhone(e) {
    if (this.data.submitting) return;
    const error = this._validate();
    if (error) { wx.showToast({ title: error, icon: 'none' }); return; }

    const phoneCode = e.detail && e.detail.code;
    if (!phoneCode) {
      wx.showToast({ title: '已取消微信手机号授权，请重试', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...', mask: true });

    try {
      await privacy.requireWechatPrivacyAuthorization();
      await api.auth.wechatResetPassword('technician', {
        phone: this.data.phone,
        phoneCode,
        newPassword: this.data.newPassword
      });
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
