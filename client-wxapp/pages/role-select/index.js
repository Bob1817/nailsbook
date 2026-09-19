const { consumePostAuthRedirect } = require('../../utils/artist-navigation');
/**
 * 注册后角色选择页
 * 兼容历史微信注册用户的身份补全页。
 * 客户必须填写美甲师邀请码，美甲师必须填写系统激活密钥。
 */
const api = require('../../services/api');

Page({
  data: {
    wechatSessionToken: '',
    phone: '',

    // 当前展开的流程：null | 'client' | 'technician'
    selectedRole: null,

    // 客户绑定
    inviteCode: '',
    findingTech: false,
    foundTech: null,

    // 美甲师激活
    activationKey: '',
    showActivationKey: false,

    loading: false,
    error: ''
  },

  onLoad(options) {
    this.setData({
      wechatSessionToken: options.wechatSessionToken || '',
      phone: options.phone || ''
    });
  },

  // ========== 角色选择 ==========

  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ selectedRole: role, error: '' });
  },

  closeFlow() {
    this.setData({
      selectedRole: null,
      inviteCode: '',
      foundTech: null,
      activationKey: '',
      error: ''
    });
  },

  // ========== 客户：邀请码 ==========

  onInviteInput(e) {
    const raw = e.detail.value.trim();
    this.setData({ inviteCode: raw, foundTech: null, error: '' });

    let code = raw;
    if (/^https?:\/\//i.test(raw)) {
      const match = raw.match(/[?&/](?:invite|code|referral)[=/#]([A-Za-z0-9_-]+)/i);
      if (match) code = match[1];
      else {
        const parts = raw.replace(/\/+$/, '').split('/');
        code = parts[parts.length - 1];
      }
      this.setData({ inviteCode: code });
    }

    if (code.length < 4) return;

    if (this._findTechTimer) clearTimeout(this._findTechTimer);
    this._findTechTimer = setTimeout(() => this._findTech(code), 500);
  },

  async _findTech(code) {
    this.setData({ findingTech: true });
    try {
      const tech = await api.client.profile.findTechByInviteCode(code);
      this.setData({ foundTech: tech });
    } catch {
      this.setData({ foundTech: null });
    } finally {
      this.setData({ findingTech: false });
    }
  },

  // ========== 美甲师：激活密钥 ==========

  onActivationKeyInput(e) {
    this.setData({ activationKey: e.detail.value.trim().toUpperCase(), error: '' });
  },

  toggleActivationKeyVisibility() {
    this.setData({ showActivationKey: !this.data.showActivationKey });
  },

  // ========== 提交 ==========

  async submitClient() {
    if (this.data.loading) return;
    if (!this.data.inviteCode || !this.data.foundTech) {
      this.setData({ error: '请输入有效的美甲师邀请码' });
      return;
    }
    this.setData({ loading: true, error: '' });

    try {
      const res = await api.auth.selectRole('client', {
        inviteCode: this.data.inviteCode
      });
      await this._handleSelectRoleResponse(res);
    } catch (err) {
      this.setData({ loading: false, error: err.message || '选择失败，请重试' });
    }
  },

  async submitTechnician() {
    if (this.data.loading) return;
    if (!/^[A-Z0-9]{16}$/.test(this.data.activationKey)) {
      this.setData({ error: '请输入 16 位系统激活密钥' });
      return;
    }
    this.setData({ loading: true, error: '' });

    try {
      const res = await api.auth.selectRole('technician', {
        activationKey: this.data.activationKey
      });
      await this._handleSelectRoleResponse(res);
    } catch (err) {
      this.setData({ loading: false, error: err.message || '选择失败，请重试' });
    }
  },

  async _handleSelectRoleResponse(res) {
    // 需要设置密码（仅客户角色可能）
    if (res.needsSetupPassword && res.passwordSetupToken) {
      wx.redirectTo({
        url: '/pages/setup-password/index?token=' + encodeURIComponent(res.passwordSetupToken) +
             '&phone=' + encodeURIComponent(res.phone || this.data.phone || '')
      });
      return;
    }

    if (!res.authenticated) {
      throw new Error(res.message || '选择失败');
    }

    const app = getApp();
    const role = res.role;

    if (role === 'client') {
      const roles = res.roles || ['client'];
      app.setLogin('client', res.accessToken || res.token, res.client || res.userInfo, roles);
      if (res.refreshToken) wx.setStorageSync('client_refreshToken', res.refreshToken);
      wx.setStorageSync('client_bindings', res.technicians || []);
      wx.reLaunch({ url: consumePostAuthRedirect('/pages/client/home/index') });
    } else if (role === 'technician') {
      app.setLogin('technician', res.accessToken || res.token, res.technician || res.userInfo, ['technician'], res.isTourist);
      if (res.refreshToken) wx.setStorageSync('technician_refreshToken', res.refreshToken);
      wx.reLaunch({ url: '/pages/technician/home/index' });
    }
  }
});
