const api = require('../../../services/api');
const { formatMoney } = require('../../../utils/format');

const STATUS_TEXT = {
  pending_first_order: '待好友完成首单',
  qualified: '已形成有效推荐',
  rejected: '未满足条件'
};

Page({
  data: {
    loading: true,
    loadFailed: false,
    stats: {
      total: 0,
      qualified: 0,
      conversionRate: '待积累',
      qualifiedRevenue: '¥0'
    },
    relations: [],
    relationDataUnavailable: false
  },

  onLoad() {
    this.loadReferrals();
  },

  onPullDownRefresh() {
    this.loadReferrals().finally(() => wx.stopPullDownRefresh());
  },

  async loadReferrals() {
    this.setData({ loading: true, loadFailed: false });
    const month = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 7);
    try {
      const overview = await api.technician.insights.overview({ month });
      const referralStats = overview.referrals || {};
      let relations = [];
      let relationDataUnavailable = false;
      try {
        const result = await api.technician.referralCampaign.relations();
        relations = (Array.isArray(result) ? result : []).map((item) => ({
          id: item.id,
          referrerName: item.referrer && item.referrer.nickname || '客户',
          referredName: item.referred && item.referred.nickname || '新客户',
          statusText: STATUS_TEXT[item.status] || '推荐处理中',
          date: String(item.createdAt || '').slice(0, 10)
        }));
      } catch (error) {
        relationDataUnavailable = true;
      }
      this.setData({
        loading: false,
        stats: {
          total: referralStats.total || 0,
          qualified: referralStats.qualified || 0,
          conversionRate: referralStats.conversionRate == null
            ? '待积累'
            : `${Math.round(referralStats.conversionRate * 100)}%`,
          qualifiedRevenue: formatMoney(referralStats.qualifiedRevenue || 0)
        },
        relations,
        relationDataUnavailable
      });
    } catch (error) {
      this.setData({ loading: false, loadFailed: true });
    }
  }
});
