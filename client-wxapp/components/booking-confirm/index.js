const api = require('../../services/api');
const { formatBookingDate, formatClock } = require('../../utils/format');
const { requestBookingReminder } = require('../../utils/wechat-subscription');

Component({
  properties: { order: { type: Object, value: null, observer: 'resetForm' } },
  data: { price: '', deposit: '', depositPaid: false, submitting: false, error: '', summary: '' },
  methods: {
    resetForm(order) {
      if (!order) return;
      this.setData({
        price: String(order.price || 0), deposit: String(order.depositAmount || 0),
        depositPaid: !!order.depositPaid, error: '',
        summary: `${formatBookingDate(order.startTime)} ${formatClock(order.startTime)}`
      });
    },
    stop() {},
    close() { if (!this.data.submitting) this.triggerEvent('close'); },
    onPrice(e) { this.setData({ price: e.detail.value, error: '' }); },
    onDeposit(e) {
      const deposit = e.detail.value;
      this.setData({ deposit, error: '', ...(Number(deposit) > 0 ? {} : { depositPaid: false }) });
    },
    onPaid(e) { this.setData({ depositPaid: !!e.detail.value, error: '' }); },
    async submit() {
      if (this.data.submitting) return;
      const money = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
      const price = String(this.data.price).trim(), deposit = String(this.data.deposit).trim();
      if (!money.test(price) || Number(price) <= 0 || Number(price) > 1000000) {
        this.setData({ error: '总价需大于 0 且不超过 100 万元，最多两位小数' }); return;
      }
      if (!money.test(deposit) || Number(deposit) > Number(price)) {
        this.setData({ error: '定金需为 0 至总价之间的金额，最多两位小数' }); return;
      }
      this.setData({ submitting: true, error: '' });
      try {
        await requestBookingReminder('technician');
        await api.technician.orders.confirm(this.data.order.id, {
          price: Number(price), depositAmount: Number(deposit),
          isDepositPaid: Number(deposit) > 0 && this.data.depositPaid
        });
        wx.showToast({ title: '已确认排期', icon: 'success' });
        this.triggerEvent('saved');
      } catch (err) {
        this.setData({ error: err.message || '确认失败，请重试' });
      } finally { this.setData({ submitting: false }); }
    }
  }
});
