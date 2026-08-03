const api = require('../../../services/api');

Page({
  data: {
    loading: true,
    relations: [],
    fundTotals: { available: 0, pending: 0, used: 0 },
    fundAccounts: [],
    sharePath: '',
    rewardNotice: '当前分享不承诺推荐奖励'
  },

  onLoad() {
    this.loadRelations();
  },

  async loadRelations() {
    try {
      const [relations, funds] = await Promise.all([
        api.client.referrals.list(),
        api.client.referrals.funds()
      ]);
      this.setData({
        relations: Array.isArray(relations) ? relations : [],
        fundTotals: funds.totals || { available: 0, pending: 0, used: 0 },
        fundAccounts: (funds.accounts || []).map(account => ({
          ...account,
          ledger: (account.ledger || []).map(entry => ({
            ...entry,
            statusText: {
              pending: '待生效',
              available: '可用',
              used: '已使用',
              expired: '已过期',
              reversed: '已冲正'
            }[entry.status] || entry.status,
            sourceText: {
              referral_reward: '好友首单推荐奖励',
              fund_redemption: '预约基金抵扣',
              fund_redemption_reversal: '预约取消退回'
            }[entry.entryType] || entry.entryType,
            createdDate: String(entry.createdAt || '').slice(0, 10)
          }))
        }))
      });
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async prepareShare() {
    try {
      wx.showLoading({ title: '生成中' });
      const result = await api.client.referrals.createLink();
      this.setData({
        sharePath: result.path,
        rewardNotice: result.rewardNotice
      });
    } catch (err) {
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onShareAppMessage() {
    return {
      title: '邀请你来预约美甲',
      path: this.data.sharePath || '/pages/client/login/index'
    };
  }
});
