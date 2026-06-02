const api = require('../../../services/api');
const { phoneMask } = require('../../../utils/util');

Page({
  data: {
    avatar: '',
    nickname: '',
    phone: '',
    technicians: [],
    showBindModal: false,
    inviteCode: '',
    foundTech: null,
    checkingCode: false,
    binding: false
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('client_userInfo');
      const bindings = wx.getStorageSync('client_bindings') || [];

      this.setData({
        avatar: userInfo?.avatarUrl || '',
        nickname: userInfo?.nickname || userInfo?.phone || '用户',
        phone: userInfo?.phone ? phoneMask(userInfo.phone) : '',
        technicians: bindings.map(b => ({
          id: b.technician?.id || b.id,
          name: b.technician?.name || b.name || '美甲师',
          avatar: b.technician?.avatarUrl || b.avatarUrl || '',
          city: b.technician?.city || b.city || '',
          status: b.technician?.status || b.status || 'active',
          homeService: b.technician?.homeService || b.homeService || false,
          isDefault: b.isDefault || false
        }))
      });
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/client/settings/index' });
  },

  navigateToAddresses() {
    wx.navigateTo({ url: '/pages/client/addresses/index' });
  },

  navigateToOrders() {
    wx.navigateTo({ url: '/pages/client/orders/index' });
  },

  navigateToFavorites() {
    wx.navigateTo({ url: '/pages/client/my-favorites/index' });
  },

  navigateToLikes() {
    wx.navigateTo({ url: '/pages/client/my-likes/index' });
  },

  navigateToChat() {
    wx.navigateTo({ url: '/pages/client/chat/index' });
  },

  navigateToHelp() {
    wx.navigateTo({ url: '/pages/client/help-feedback/index' });
  },

  switchRole() {
    wx.navigateTo({ url: '/pages/role-select/index' });
  },

  // 绑定美甲师
  openBindModal() {
    this.setData({ showBindModal: true, inviteCode: '', foundTech: null });
  },

  closeBindModal() {
    this.setData({ showBindModal: false, inviteCode: '', foundTech: null });
  },

  async onInviteCodeInput(e) {
    const code = e.detail.value.trim();
    this.setData({ inviteCode: code, foundTech: null });

    if (code.length >= 4) {
      this.setData({ checkingCode: true });
      try {
        const tech = await api.client.profile.findTechByInviteCode(code);
        this.setData({ foundTech: tech });
      } catch {
        this.setData({ foundTech: null });
      } finally {
        this.setData({ checkingCode: false });
      }
    }
  },

  async bindTechnician() {
    const { foundTech, inviteCode, binding } = this.data;
    if (!foundTech || binding) return;

    this.setData({ binding: true });
    wx.showLoading({ title: '绑定中...' });

    try {
      await api.client.profile.bindTechnician(foundTech.id, inviteCode);
      wx.hideLoading();
      wx.showToast({ title: '绑定成功', icon: 'success' });
      this.setData({ showBindModal: false, inviteCode: '', foundTech: null });

      // 刷新用户数据
      const res = await api.auth.getUserInfo('client');
      if (res.bindings) {
        wx.setStorageSync('client_bindings', res.bindings);
      }
      this.loadProfile();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '绑定失败', icon: 'none' });
    } finally {
      this.setData({ binding: false });
    }
  },

  async unbindTechnician(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '解除绑定',
      content: `确定要解除与"${name}"的绑定吗？`,
      confirmText: '解除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.client.profile.unbindTechnician(id);
          wx.hideLoading();
          wx.showToast({ title: '已解除绑定', icon: 'success' });
          const refreshed = await api.auth.getUserInfo('client');
          if (refreshed.bindings) wx.setStorageSync('client_bindings', refreshed.bindings);
          this.loadProfile();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  },

  async setDefaultTech(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await api.client.profile.setDefaultTechnician(id);
      wx.showToast({ title: '已设为默认', icon: 'success' });
      const res = await api.auth.getUserInfo('client');
      if (res.bindings) wx.setStorageSync('client_bindings', res.bindings);
      this.loadProfile();
    } catch (err) {
      wx.showToast({ title: err.message || '设置失败', icon: 'none' });
    }
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          wx.redirectTo({ url: '/pages/role-select/index' });
        }
      }
    });
  }
});
