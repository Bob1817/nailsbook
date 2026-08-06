const api = require('../../../services/api');
const { formatMoney } = require('../../../utils/format');

Page({
  data: {
    loading: true,
    exporting: false,
    overview: null
  },

  onLoad() {
    if (wx.getStorageSync('role') !== 'technician') {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }
    this.loadOverview();
  },

  onPullDownRefresh() {
    this.loadOverview().finally(() => wx.stopPullDownRefresh());
  },

  async loadOverview() {
    this.setData({ loading: true });
    try {
      const data = await api.technician.insights.overview();
      this.setData({ overview: this.formatOverview(data), loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '经营数据加载失败', icon: 'none' });
    }
  },

  formatOverview(data) {
    const performance = data.performance || {};
    return {
      revenue: formatMoney(data.revenue.monthConfirmed || 0),
      averageTicket: data.revenue.averageTicket == null ? '待积累' : formatMoney(data.revenue.averageTicket),
      monthCompleted: data.bookings.monthCompleted || 0,
      pending: data.bookings.pending || 0,
      today: data.bookings.today || 0,
      totalCustomers: data.customers.total || 0,
      newCustomers: data.customers.newThisMonth || 0,
      repeatRate: data.customers.repeatRate == null ? '待积累' : `${Math.round(data.customers.repeatRate * 100)}%`,
      dueCustomers: data.customers.dueForRepurchase || 0,
      rating: data.rating.average == null ? '待积累' : Number(data.rating.average).toFixed(1),
      ratingCount: data.rating.count || 0,
      works: data.works.total || 0,
      referrals: data.referrals.total || 0,
      qualifiedReferrals: data.referrals.qualified || 0,
      referralRevenue: formatMoney(data.referrals.qualifiedRevenue || 0),
      fundsIssued: formatMoney(data.funds.issued || 0),
      fundsRedeemed: formatMoney(data.funds.redeemed || 0),
      dailyTrend: (data.trends.daily || []).slice(-7).map(item => ({ ...item, label: item.period.slice(5), revenueText: formatMoney(item.revenue) })),
      weeklyTrend: (data.trends.weekly || []).slice(-4).map(item => ({ ...item, label: `${item.period.slice(5)} 周`, revenueText: formatMoney(item.revenue) })),
      performanceReady: !!performance.sufficientData,
      performanceMinimum: performance.minimumSampleSize || 5,
      topServices: (performance.services || []).slice(0, 3).map(item => ({ ...item, revenueText: formatMoney(item.revenue) })),
      topTimeSlots: (performance.timeSlots || []).slice(0, 3).map(item => ({ ...item, revenueText: formatMoney(item.revenue) })),
      reminders: (data.reminders || []).map(item => ({ ...item, typeText: { due: '待复购', dormant: '沉睡客户', high_value: '高价值客户' }[item.type] || '经营提醒' }))
    };
  },

  openOrders() { wx.navigateTo({ url: '/pages/technician/all-bookings/index?status=completed' }); },
  openCustomers() { wx.navigateTo({ url: '/pages/technician/customers/index' }); },
  openDueCustomers() { wx.navigateTo({ url: '/pages/technician/customers/index?lifecycle=due' }); },
  openReferrals() { wx.navigateTo({ url: '/pages/technician/referral-campaign/index' }); },
  async exportRevenue() {
    if (this.data.exporting) return;
    this.setData({ exporting: true });
    try {
      const data = await api.technician.revenues.exportCsv();
      const filePath = `${wx.env.USER_DATA_PATH}/经营收入-${Date.now()}.csv`;
      await new Promise((resolve, reject) => {
        wx.getFileSystemManager().writeFile({ filePath, data, success: resolve, fail: reject });
      });
      await new Promise((resolve, reject) => {
        wx.openDocument({ filePath, fileType: 'csv', showMenu: true, success: resolve, fail: reject });
      });
    } catch (e) {
      wx.showToast({ title: e.message || '当前套餐暂不支持导出', icon: 'none' });
    } finally {
      this.setData({ exporting: false });
    }
  },
  async exportFullData() {
    if (this.data.exporting) return;
    this.setData({ exporting: true });
    try {
      const data = await api.technician.revenues.exportFull();
      const fileName = `完整经营数据-${Date.now()}.json`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      await new Promise((resolve, reject) => {
        wx.getFileSystemManager().writeFile({ filePath, data, success: resolve, fail: reject });
      });
      await new Promise((resolve, reject) => {
        wx.shareFileMessage({ filePath, fileName, success: resolve, fail: reject });
      });
    } catch (e) {
      wx.showToast({ title: e.message || '完整导出需高级版套餐', icon: 'none' });
    } finally {
      this.setData({ exporting: false });
    }
  },
  openCustomer(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/technician/customer-detail/index?id=${id}` });
  }
});
