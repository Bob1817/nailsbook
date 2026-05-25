const api = require('../../../services/api');

Page({
  data: {
    userInfo: null,
    stats: {
      worksCount: 0,
      customersCount: 0,
      ordersCount: 0
    }
  },

  onLoad() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
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
      wx.showToast({
        title: newStatus === 'active' ? '已开启服务' : '已暂停服务',
        icon: 'success'
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    }
  },

  editProfile() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  manageServices() {
    wx.navigateTo({ url: '/pages/technician/services/index' });
  },

  manageWorks() {
    wx.navigateTo({ url: '/pages/technician/works/index' });
  },

  shareInvite() {
    const { userInfo } = this.data;
    const inviteCode = userInfo?.invitationCode || '';

    if (inviteCode) {
      wx.showModal({
        title: '邀请码',
        content: `您的邀请码是：${inviteCode}\n分享给客户，让他们绑定到您的账号`,
        showCancel: true,
        confirmText: '复制',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: inviteCode,
              success: () => {
                wx.showToast({ title: '已复制', icon: 'success' });
              }
            });
          }
        }
      });
    } else {
      wx.showToast({ title: '暂无邀请码', icon: 'none' });
    }
  },

  switchRole() {
    wx.navigateTo({ url: '/pages/role-select/index' });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.logout();
          wx.redirectTo({ url: '/pages/role-select/index' });
        }
      }
    });
  }
});
