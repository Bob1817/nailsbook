const api = require('../../../services/api');

Page({
  data: {
    loading: true,
    loadFailed: false,
    relations: [],
    fundTotals: { available: 0, pending: 0, used: 0 },
    issuedCost: 0,
    rewardNotice: '好友首个有效订单完成后，邀请人获得订单有效实付金额 5% 的美甲基金'
  },

  onLoad() {
    this.loadCampaign();
  },

  onPullDownRefresh() {
    this.loadCampaign().finally(() => wx.stopPullDownRefresh());
  },

  async loadCampaign() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const [relations, funds] = await Promise.all([
        api.technician.referralCampaign.relations(),
        api.technician.referralCampaign.fundSummary()
      ]);
      this.setData({
        loading: false,
        relations: Array.isArray(relations) ? relations : [],
        fundTotals: funds.totals || { available: 0, pending: 0, used: 0 },
        issuedCost: funds.issuedCost || 0
      });
    } catch (err) {
      this.setData({ loading: false, loadFailed: true });
    }
  }
});
