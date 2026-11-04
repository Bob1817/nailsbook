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
    const conversion = data.conversion || {};
    const formatRate = (value) => value == null ? '待积累' : `${Math.round(value * 100)}%`;
    const homepage = conversion.homepage || null;
    const worksConversion = conversion.works || null;
    const revenueVal = Number(data.revenue && data.revenue.monthConfirmed) || 0;
    const completedVal = Number(data.bookings && data.bookings.monthCompleted) || 0;
    const newCustVal = Number(data.customers && data.customers.newThisMonth) || 0;
    const dueCustVal = Number(data.customers && data.customers.dueForRepurchase) || 0;
    const repeatRateVal = data.customers && data.customers.repeatRate != null ? Math.round(data.customers.repeatRate * 100) : null;
    const topService = performance.services && performance.services[0] ? performance.services[0].name : null;
    const topSlot = performance.timeSlots && performance.timeSlots[0] ? performance.timeSlots[0].name : null;

    const insights = [];
    if (completedVal > 0) {
      insights.push({
        tag: '营收表现',
        tone: 'positive',
        text: `本月已完成入账 ${completedVal} 笔订单，总确认收入 ${formatMoney(revenueVal)}，平均客单价 ${data.revenue.averageTicket == null ? '待积累' : formatMoney(data.revenue.averageTicket)}。`
      });
    } else {
      insights.push({
        tag: '经营起步',
        tone: 'neutral',
        text: '本月尚无已完成入账订单，可通过发布精选作品、主动分享专属报价单快速获客成单。'
      });
    }

    if (repeatRateVal !== null) {
      insights.push({
        tag: '客户健康度',
        tone: repeatRateVal >= 30 ? 'positive' : 'neutral',
        text: `当月老客户复购率达 ${repeatRateVal}%，新增客户 ${newCustVal} 位。${dueCustVal > 0 ? `当前有 ${dueCustVal} 位客户已临近复购周期，建议主动发起关怀沟通。` : '客户资产稳步留存。'}`
      });
    } else if (newCustVal > 0) {
      insights.push({
        tag: '客群增长',
        tone: 'positive',
        text: `本月新增 ${newCustVal} 位新客户，建议服务完成后及时记录美甲档案以促成下次复购。`
      });
    }

    if (topService && topSlot) {
      insights.push({
        tag: '排期与款式',
        tone: 'positive',
        text: `「${topService}」为本月最受欢迎款式，${topSlot} 预约最集中，建议后续优先开放该时段排期并主推相关款式。`
      });
    } else if (topService) {
      insights.push({
        tag: '主推款式',
        tone: 'positive',
        text: `「${topService}」是当前贡献最高的服务款式，可多拍摄同款美甲作品在主页展示。`
      });
    } else {
      insights.push({
        tag: '经营建议',
        tone: 'neutral',
        text: '持续完善服务档案并关联美甲作品，系统将在积累 5 单后自动生成款式排行与时段效率分析。'
      });
    }

    return {
      workShare: conversion.workShare || null,
      homepageConversion: homepage && {
        ...homepage,
        followRateText: formatRate(homepage.rates && homepage.rates.followRate),
        bookingRateText: formatRate(homepage.rates && homepage.rates.bookingIntentRate),
        orderRateText: formatRate(homepage.rates && homepage.rates.orderRate)
      },
      worksConversion: worksConversion && {
        ...worksConversion,
        shareRateText: formatRate(worksConversion.rates && worksConversion.rates.shareRate),
        bookingRateText: formatRate(worksConversion.rates && worksConversion.rates.bookingIntentRate),
        orderRateText: formatRate(worksConversion.rates && worksConversion.rates.orderRate)
      },
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
      reminders: (data.reminders || []).map(item => ({ ...item, typeText: { due: '待复购', dormant: '沉睡客户', high_value: '高价值客户' }[item.type] || '经营提醒' })),
      insights
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
