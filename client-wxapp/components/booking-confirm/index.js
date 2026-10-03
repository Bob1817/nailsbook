const api = require('../../services/api');
const { formatBookingDate, formatClock } = require('../../utils/format');
const { requestBookingReminder } = require('../../utils/wechat-subscription');

const { action: checkboxColor } = require('../../utils/colors');
const money = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
function validDeposit(price, deposit) {
  return money.test(String(price).trim()) && Number(price) > 0 && Number(price) <= 1000000
    && money.test(String(deposit).trim()) && Number(deposit) <= Number(price);
}

Component({
  properties: { order: { type: Object, value: null, observer: 'resetForm' } },
  data: { checkboxColor, showDepositStatus: false, depositError: '', price: '', deposit: '', depositPaid: false, proposalChanged: false, submitting: false, error: '', summary: '' },
  methods: {
    resetForm(order) {
      if (!order) return;
      this.setData({
        price: String(order.price || 0), deposit: String(order.depositAmount || 0),
        depositPaid: false, proposalChanged: false, error: '', depositError: '',
        showDepositStatus: validDeposit(order.price, order.depositAmount || 0) && Number(order.depositAmount) > 0,
        summary: `${formatBookingDate(order.startTime)} ${formatClock(order.startTime)}`
      });
    },
    stop() {},
    close() { if (!this.data.submitting) this.triggerEvent('close'); },
    updateProposalChanged(price, deposit) {
      const order = this.data.order || {};
      this.setData({ proposalChanged: Number(price) !== Number(order.price || 0) || Number(deposit) !== Number(order.depositAmount || 0) });
    },
    validateDeposit() {
      const valid = validDeposit(this.data.price, this.data.deposit);
      const showDepositStatus = valid && Number(this.data.deposit) > 0;
      this.setData({
        showDepositStatus,
        depositError: valid ? '' : '该金额不可用，请填写 0 至最终总价之间的金额，最多两位小数',
        ...(!showDepositStatus ? { depositPaid: false } : {})
      });
      return valid;
    },
    onPrice(e) {
      const price = e.detail.value;
      this.setData({ price, error: '' });
      this.updateProposalChanged(price, this.data.deposit);
      this.validateDeposit();
    },
    onDeposit(e) {
      const deposit = e.detail.value;
      this.setData({ deposit, error: '', ...(Number(deposit) > 0 ? {} : { depositPaid: false }) });
      this.updateProposalChanged(this.data.price, deposit);
      this.validateDeposit();
    },
    onPaid(e) {
      if (this.data.submitting || !this.data.showDepositStatus) return;
      const values = Array.isArray(e.detail.value) ? e.detail.value : [];
      this.setData({ depositPaid: values.includes('paid'), error: '' });
    },
    async submit() {
      if (this.data.submitting) return;
      const price = String(this.data.price).trim(), deposit = String(this.data.deposit).trim();
      if (!money.test(price) || Number(price) <= 0 || Number(price) > 1000000) {
        this.setData({ error: '总价需大于 0 且不超过 100 万元，最多两位小数' }); return;
      }
      if (!this.validateDeposit()) {
        this.setData({ error: '定金需为 0 至总价之间的金额，最多两位小数' }); return;
      }
      this.setData({ submitting: true, error: '' });
      try {
        await requestBookingReminder('technician');
        const result = await api.technician.orders.confirm(this.data.order.id, {
          price: Number(price), depositAmount: Number(deposit),
          isDepositPaid: Number(deposit) > 0 && this.data.depositPaid
        });
        wx.showToast({ title: result && result.status === 'pending_agree' ? '已发送客户确认' : '已确认排期', icon: 'success' });
        this.triggerEvent('saved');
      } catch (err) {
        this.setData({ error: err.message || '确认失败，请重试' });
      } finally { this.setData({ submitting: false }); }
    }
  }
});
