const { phoneMask } = require('../../../utils/util');

Page({
  data: {
    avatar: '',
    nickname: '',
    phone: ''
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      avatar: userInfo?.avatarUrl || '',
      nickname: userInfo?.nickname || '用户',
      phone: userInfo?.phone ? phoneMask(userInfo.phone) : ''
    });
  },

  navigateToAddresses() {
    wx.navigateTo({ url: '/pages/client/addresses/index' });
  },

  navigateToOrders() {
    wx.navigateTo({ url: '/pages/client/orders/index' });
  },

  navigateToFavorites() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  switchRole() {
    wx.navigateTo({ url: '/pages/role-select/index' });
  }
});