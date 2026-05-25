Page({
  data: {
    avatar: '',
    nickname: '',
    phone: '',
    techAvatar: '',
    techName: ''
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const userInfo = wx.getStorageSync('client_userInfo');
    const bindings = wx.getStorageSync('client_bindings') || [];

    let techAvatar = '';
    let techName = '';

    if (bindings.length > 0 && bindings[0].technician) {
      techAvatar = bindings[0].technician.avatarUrl || '';
      techName = bindings[0].technician.name || '';
    }

    this.setData({
      avatar: userInfo?.avatarUrl || '',
      nickname: userInfo?.nickname || '用户',
      phone: userInfo?.phone || '',
      techAvatar,
      techName
    });
  },

  navigateToWorks() {
    wx.navigateTo({ url: '/pages/client/works/index' });
  },

  navigateToBooking() {
    wx.navigateTo({ url: '/pages/client/create-order/index' });
  },

  navigateToAddresses() {
    wx.navigateTo({ url: '/pages/client/addresses/index' });
  },

  switchRole() {
    wx.navigateTo({ url: '/pages/role-select/index' });
  }
});