/**
 * NailBook 新用户引导页
 * 注册后：选择"绑定美甲师"或"我是美甲师"或"稍后再说"
 */
const api = require('../../services/api');

Page({
  data: {
    // 绑定美甲师
    showBindFlow: false,
    inviteCode: '',
    checkingCode: false,
    foundTech: null,
    bindNote: '',
    bindError: '',
    binding: false,

    // 我是美甲师
    showTechFlow: false,
    activateKey: '',
    showActivateKey: false,
    activateError: '',
    activating: false,

    _debounceTimer: null
  },

  // ========== 绑定美甲师 ==========

  showBindFlow() {
    this.setData({ showBindFlow: true, showTechFlow: false });
  },

  onInviteInput(e) {
    const raw = e.detail.value.trim();
    this.setData({ inviteCode: raw, foundTech: null, bindError: '' });

    // 如果是链接 → 尝试提取邀请码
    let code = raw;
    if (/^https?:\/\//i.test(raw)) {
      const match = raw.match(/[?&/](?:invite|code|referral)[=/#]([A-Za-z0-9_-]+)/i);
      if (match) code = match[1];
      else {
        // 尝试从路径最后一段取
        const parts = raw.replace(/\/+$/, '').split('/');
        code = parts[parts.length - 1];
      }
      // 更新显示为提取后的邀请码
      this.setData({ inviteCode: code });
    }

    if (!code || code.length < 4) return;

    // 防抖：500ms
    if (this.data._debounceTimer) clearTimeout(this.data._debounceTimer);
    this.data._debounceTimer = setTimeout(() => this._findTech(code), 500);
  },

  async _findTech(code) {
    this.setData({ checkingCode: true });
    try {
      const tech = await api.client.profile.findTechByInviteCode(code);
      this.setData({ foundTech: tech, bindError: '' });
    } catch {
      this.setData({ foundTech: null });
    } finally {
      this.setData({ checkingCode: false });
    }
  },

  onBindNoteInput(e) {
    this.setData({ bindNote: e.detail.value });
  },

  async submitBind() {
    const { foundTech, inviteCode, bindNote, binding } = this.data;
    if (!foundTech || binding) return;

    this.setData({ binding: true });
    wx.showLoading({ title: '绑定中...', mask: true });

    try {
      await api.client.profile.bindTechnician(foundTech.id, inviteCode, bindNote);
      wx.hideLoading();
      wx.showToast({ title: '绑定申请已提交', icon: 'success' });

      // 回到首页
      this._goHome();
    } catch (err) {
      wx.hideLoading();
      this.setData({ binding: false, bindError: err.message || '绑定失败' });
    }
  },

  // ========== 我是美甲师 ==========

  showTechFlow() {
    this.setData({ showTechFlow: true, showBindFlow: false });
  },

  onActivateKeyInput(e) {
    this.setData({ activateKey: e.detail.value.trim(), activateError: '' });
  },

  toggleActivateKeyVisibility() {
    this.setData({ showActivateKey: !this.data.showActivateKey });
  },

  async submitActivate() {
    const key = this.data.activateKey.trim();
    if (!key) {
      this.setData({ activateError: '请输入激活密钥' });
      return;
    }

    this.setData({ activating: true });
    wx.showLoading({ title: '激活中...', mask: true });

    try {
      const res = await api.auth.activateTechnician(key);
      wx.hideLoading();

      // 保存美甲师 token
      const app = getApp();
      wx.setStorageSync('technician_token', res.accessToken || res.token);
      wx.setStorageSync('technician_userInfo', res.technician || res.userInfo);

      // 更新 roles
      const currentRoles = wx.getStorageSync('roles') || ['client'];
      if (!currentRoles.includes('technician')) {
        currentRoles.push('technician');
        wx.setStorageSync('roles', currentRoles);
      }

      wx.showToast({ title: '激活成功！', icon: 'success', duration: 1500 });

      // 跳转美甲师首页
      setTimeout(() => {
        app.switchRole('technician');
        wx.reLaunch({ url: '/pages/technician/home/index' });
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      this.setData({ activating: false, activateError: err.message || '激活失败，请检查密钥' });
    }
  },

  // ========== 通用 ==========

  closeFlows() {
    this.setData({ showBindFlow: false, showTechFlow: false });
  },

  skipOnboarding() {
    wx.showModal({
      title: '跳过引导',
      content: '你可以在"我的"页面随时绑定美甲师或开通美甲师账户',
      confirmText: '先去逛逛',
      cancelText: '继续设置',
      confirmColor: '#ff6b8a',
      success: (res) => {
        if (res.confirm) this._goHome();
      }
    });
  },

  _goHome() {
    wx.reLaunch({ url: '/pages/client/home/index' });
  }
});
