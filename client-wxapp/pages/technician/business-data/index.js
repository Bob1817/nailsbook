const api = require('../../../services/api');
const { formatMoney } = require('../../../utils/format');

Page({
  data: {
    loading: true,
    exporting: false,
    overview: null,
    selectedMonth: '', minMonth: '', maxMonth: '', error: ''
  },

  onLoad() {
    if (wx.getStorageSync('role') !== 'technician') {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }
    const month = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 7);
    this.setData({ selectedMonth: month, minMonth: month, maxMonth: month });
    this.loadOverview();
  },

  onPullDownRefresh() {
    this.loadOverview().finally(() => wx.stopPullDownRefresh());
  },

  onMonthChange(e) {
    const month = e.detail.value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < this.data.minMonth || month > this.data.maxMonth || month === this.data.selectedMonth) return;
    this.setData({ selectedMonth: month });
    this.loadOverview();
  },

  async loadOverview() {
    const requestId = this.requestId = (this.requestId || 0) + 1;
    const month = this.data.selectedMonth;
    this.setData({ loading: true, overview: null, error: '' });
    try {
      const data = await api.technician.insights.overview({ month });
      if (requestId !== this.requestId) return;
      if (!data.period || data.period.selectedMonth !== month) throw new Error('月份统计服务尚未更新，请稍后重试');
      this.period = data.period;
      this.setData({ overview: this.formatOverview(data), loading: false, minMonth: data.period.minMonth, maxMonth: data.period.maxMonth });
    } catch (e) {
      if (requestId !== this.requestId) return;
      this.setData({ loading: false, error: e.message || '经营数据加载失败，请重试' });
    }
  },

  exportRange() {
    return { startDate: this.period.monthStart, endDate: new Date(new Date(this.period.endExclusive).getTime() - 1).toISOString() };
  },

  formatOverview(data) {
    const performance = data.performance || {};
    return {
      workShare: data.conversion && data.conversion.workShare || null,
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
      promotions: {
        active: data.promotions && data.promotions.active || 0,
        attributedBookings: data.promotions && data.promotions.attributedBookings || 0,
        quoted: data.promotions && data.promotions.quoted || 0,
        discountsRedeemed: formatMoney((data.promotions && data.promotions.discountsRedeemedFen || 0) / 100)
      },
      referrals: data.referrals.total || 0,
      qualifiedReferrals: data.referrals.qualified || 0,
      referralRevenue: formatMoney(data.referrals.qualifiedRevenue || 0),
      fundsIssued: formatMoney(data.funds.issued || 0),
      fundsRedeemed: formatMoney(data.funds.redeemed || 0),
      dailyTrend: (data.trends.daily || []).map(item => ({ ...item, label: item.period.slice(5), revenueText: formatMoney(item.revenue) })),
      weeklyTrend: (data.trends.weekly || []).map(item => ({ ...item, label: `${item.period.slice(5)} 周`, revenueText: formatMoney(item.revenue) })),
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
      const data = await api.technician.revenues.exportCsv(this.exportRange());
      const filePath = `${wx.env.USER_DATA_PATH}/经营收入-${this.data.selectedMonth}-${Date.now()}.csv`;
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
      const data = await api.technician.revenues.exportFull(this.exportRange());
      const fileName = `完整经营数据-${this.data.selectedMonth}-${Date.now()}.json`;
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
