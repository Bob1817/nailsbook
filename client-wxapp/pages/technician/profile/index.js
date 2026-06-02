const api = require('../../../services/api');
const { phoneMask } = require('../../../utils/util');

Page({
  data: {
    userInfo: {},
    stats: { worksCount: 0, customersCount: 0, ordersCount: 0 }
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};
      if (userInfo.phone) userInfo.phoneDisplay = phoneMask(userInfo.phone);
      this.setData({ userInfo });

      const res = await api.technician.dashboard();
      this.setData({
        stats: {
          worksCount: res.worksCount || 0,
          customersCount: res.customersCount || 0,
          ordersCount: res.ordersCount || 0
        }
      });
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  },

  async toggleStatus() {
    const { userInfo } = this.data;
    const newStatus = userInfo.status === 'active' ? 'inactive' : 'active';
    try {
      wx.showLoading({ title: '更新中...' });
      await api.technician.auth.updateStatus(newStatus);
      userInfo.status = newStatus;
      this.setData({ userInfo });
      wx.setStorageSync('userInfo', userInfo);
      wx.hideLoading();
      wx.showToast({ title: newStatus === 'active' ? '已开启接单' : '已暂停接单', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    }
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/technician/profile-settings/index' });
  },

  shareInvite() {
    const code = this.data.userInfo?.invitationCode;
    if (!code) { wx.showToast({ title: '暂无邀请码', icon: 'none' }); return; }
    wx.showModal({
      title: '我的邀请码',
      content: `邀请码：${code}\n分享给客户，让他们绑定到你的账号`,
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({ data: code, success: () => wx.showToast({ title: '已复制', icon: 'success' }) });
        }
      }
    });
  },

  navigateToServices() { wx.navigateTo({ url: '/pages/technician/services/index' }); },
  navigateToWorks() { wx.navigateTo({ url: '/pages/technician/works/index' }); },
  navigateToHomeService() { wx.navigateTo({ url: '/pages/technician/home-service-settings/index' }); },
  navigateToServiceTime() { wx.navigateTo({ url: '/pages/technician/service-time/index' }); },
  navigateToShops() { wx.navigateTo({ url: '/pages/technician/shop-management/index' }); },
  navigateToTagManagement() { wx.navigateTo({ url: '/pages/technician/tag-management/index' }); },
  navigateToSubscription() { wx.navigateTo({ url: '/pages/technician/subscription/index' }); },
  navigateToAccountSecurity() { wx.navigateTo({ url: '/pages/technician/account-security/index' }); },
  navigateToHelp() { wx.navigateTo({ url: '/pages/technician/help-feedback/index' }); },
  navigateToAbout() { wx.navigateTo({ url: '/pages/technician/about/index' }); },

  switchRole() {
    wx.navigateTo({ url: '/pages/role-select/index' });
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
