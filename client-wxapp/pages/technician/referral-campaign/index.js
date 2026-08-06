const api = require('../../../services/api');

Page({
  data: {
    loading: true,
    loadFailed: false,
    fundTotals: { available: '0.00', pending: '0.00', used: '0.00' },
    transactions: []
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
      const funds = await api.technician.referralCampaign.fundSummary();
      const transactions = (funds.accounts || []).reduce((result, account) => {
        const clientName = account.client && account.client.nickname ? account.client.nickname : '客户';
        return result.concat((account.ledger || []).map((entry) => {
          const isExpense = entry.entryType === 'fund_redemption' || entry.status === 'expired';
          const sourceMap = {
            referral_reward: '客户首单邀请奖励',
            fund_redemption: '预约订单基金抵扣',
            fund_redemption_reversal: '预约取消基金退回'
          };
          const statusMap = {
            pending: '待生效', available: '已入账', used: '已使用', expired: '已过期', reversed: '已冲正'
          };
          return {
            id: entry.id,
            title: sourceMap[entry.entryType] || '基金账户变动',
            clientName,
            date: String(entry.createdAt || '').slice(0, 10),
            statusText: statusMap[entry.status] || entry.status,
            amountText: `${isExpense ? '-' : '+'}¥${Math.abs(Number(entry.amount || 0)).toFixed(2)}`,
            type: isExpense ? 'expense' : 'income',
            timestamp: new Date(entry.createdAt || 0).getTime()
          };
        }));
      }, []).sort((a, b) => b.timestamp - a.timestamp);
      this.setData({
        loading: false,
        fundTotals: {
          available: Number((funds.totals || {}).available || 0).toFixed(2),
          pending: Number((funds.totals || {}).pending || 0).toFixed(2),
          used: Number((funds.totals || {}).used || 0).toFixed(2)
        },
        transactions
      });
    } catch (err) {
      this.setData({ loading: false, loadFailed: true });
    }
  }
});
