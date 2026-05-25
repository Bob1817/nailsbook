const app = getApp();

Page({
  data: {},

  onLoad() {
    console.log('Role select page loaded');
  },

  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    console.log('Selected role:', role);

    if (role === 'client') {
      wx.navigateTo({ url: '/pages/client/login/index' });
    } else {
      wx.navigateTo({ url: '/pages/technician/login/index' });
    }
  }
});