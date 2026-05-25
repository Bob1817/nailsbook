const api = require('../../../services/api');
const { formatTime, phoneMask } = require('../../../utils/util');

Page({
  data: {
    avatar: '',
    name: '',
    phone: '',
    todayOrders: 0,
    totalAmount: '¥0',
    rating: 0,
    recentOrders: []
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    if (getApp().globalData.role === 'technician') {
      this.loadData();
    }
  },

  checkLogin() {
    const role = wx.getStorageSync('role');
    if (role !== 'technician') {
      wx.redirectTo({ url: '/pages/role-select/index' });
    }
  },

  async loadData() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      this.setData({
        avatar: userInfo?.avatarUrl || '',
        name: userInfo?.name || '美甲师',
        phone: userInfo?.phone ? phoneMask(userInfo.phone) : ''
      });

      await this.loadDashboard();
    } catch (err) {
      console.error('loadData error:', err);
    }
  },

  async loadDashboard() {
    try {
      const res = await api.technician.dashboard();

      const recentOrders = (res.todaySchedule || []).map(item => ({
        id: item.id,
        orderNo: item.orderNo,
        serviceType: item.serviceType || '美甲服务',
        startTime: formatTime(item.startTime),
        address: item.address || '到店'
      }));

      this.setData({
        todayOrders: res.todayOrders || 0,
        totalAmount: `¥${(res.monthlyRevenue || 0).toFixed(0)}`,
        rating: res.rating || 0,
        recentOrders
      });
    } catch (err) {
      console.error('loadDashboard error:', err);
    }
  },

  navigateToOrders() {
    wx.navigateTo({ url: '/pages/technician/orders/index' });
  },

  navigateToCustomers() {
    wx.navigateTo({ url: '/pages/technician/customers/index' });
  },

  navigateToWorks() {
    wx.navigateTo({ url: '/pages/technician/works/index' });
  },

  navigateToSchedule() {
    wx.navigateTo({ url: '/pages/technician/schedule/index' });
  },

  viewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  onPullDownRefresh() {
    this.loadDashboard().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});