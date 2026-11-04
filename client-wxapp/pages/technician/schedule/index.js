const bookingRealtime = require('../../../utils/booking-realtime');
const api = require('../../../services/api');
const { decorateTechnicianOrder } = require('../../../utils/order');
const { technicianBookingCardHandlers = {} } = require('../utils/technician-booking-actions');

Page({
  onBookingChanged() { return this.loadOrders(this.data.selectedDate, { silent: true }); },
  onBookingCardOpen: technicianBookingCardHandlers.onBookingCardOpen,
  onBookingCardQuote: technicianBookingCardHandlers.onBookingCardQuote,
  onBookingCardWithdrawQuote: technicianBookingCardHandlers.onBookingCardWithdrawQuote,
  onBookingCardEditBooking: technicianBookingCardHandlers.onBookingCardEditBooking,
  onBookingCardReject: technicianBookingCardHandlers.onBookingCardReject,
  onBookingCardCancel: technicianBookingCardHandlers.onBookingCardCancel,
  onBookingCardComplete: technicianBookingCardHandlers.onBookingCardComplete,
  onBookingCardRebook: technicianBookingCardHandlers.onBookingCardRebook,
  onBookingCardConfirmed: technicianBookingCardHandlers.onBookingCardConfirmed,
  onBookingCardRecord: technicianBookingCardHandlers.onBookingCardRecord,
  onBookingCardUploadWork: technicianBookingCardHandlers.onBookingCardUploadWork,
  onBookingCardViewWork: technicianBookingCardHandlers.onBookingCardViewWork,
  data: {
    selectedDate: '',
    days: [],
    dayOrders: [],
    dayBlockedSlots: [],
    loading: false,
    loadFailed: false,
    showBlockModal: false,
    blockStartTime: '14:00',
    blockEndTime: '16:00',
    blockReason: '私人事项',
    blockReasonOptions: ['私人事项', '外出采买', '设备维护', '休息调整'],
    customReason: '',
    submittingBlock: false
  },

  onShow() {
    bookingRealtime.start();
    if (!this.data.loading) this.loadOrders(this.data.selectedDate);
  },

  onLoad() {
    const today = this._formatDate(new Date());
    this.setData({ selectedDate: today });
    this._buildWeekDays(new Date());
    this.loadOrders(today);
  },

  _formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  _buildWeekDays(anchor) {
    const days = [];
    const DOW = ['日', '一', '二', '三', '四', '五', '六'];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(anchor);
      d.setDate(d.getDate() + i);
      days.push({
        date: this._formatDate(d),
        dayNum: d.getDate(),
        dow: DOW[d.getDay()]
      });
    }
    this.setData({ days });
  },

  selectDay(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date });
    this.loadOrders(date);
  },

  async loadOrders(date, options = {}) {
    const requestId = this._requestId = (this._requestId || 0) + 1;
    if (!options.silent) this.setData({ loading: true, loadFailed: false });
    try {
      const [res, technicianProfile, blockedRes] = await Promise.all([
        api.technician.orders.list({ date }),
        api.technician.auth && api.technician.auth.getUserInfo ? api.technician.auth.getUserInfo().catch(() => ({})) : Promise.resolve({}),
        api.technician.bookingDays && api.technician.bookingDays.listBlockedSlots ? api.technician.bookingDays.listBlockedSlots({ date }).catch(() => []) : Promise.resolve([])
      ]);
      if (requestId !== this._requestId) return;
      const all = Array.isArray(res) ? res : (res.list || res.data || []);
      const shops = Array.isArray(technicianProfile.shopAddresses) ? technicianProfile.shopAddresses : [];
      const dayOrders = all
        .map(order => decorateTechnicianOrder(order, shops))
        .filter(Boolean)
        .filter(o => o.status !== 'cancelled')
        .sort((a, b) => (a._clock > b._clock ? 1 : -1));

      const rawSlots = Array.isArray(blockedRes) ? blockedRes : (blockedRes.list || blockedRes.data || []);
      const dayBlockedSlots = rawSlots.map(slot => {
        const s = new Date(slot.startTime);
        const e = new Date(slot.endTime);
        const sHours = isNaN(s.getHours()) ? '00' : String(s.getHours()).padStart(2, '0');
        const sMins = isNaN(s.getMinutes()) ? '00' : String(s.getMinutes()).padStart(2, '0');
        const eHours = isNaN(e.getHours()) ? '00' : String(e.getHours()).padStart(2, '0');
        const eMins = isNaN(e.getMinutes()) ? '00' : String(e.getMinutes()).padStart(2, '0');
        const sTime = `${sHours}:${sMins}`;
        const eTime = `${eHours}:${eMins}`;
        return {
          id: slot.id,
          startTimeText: sTime,
          endTimeText: eTime,
          timeRange: `${sTime} - ${eTime}`,
          reason: slot.reason || '临时锁档'
        };
      });

      this.setData({ dayOrders, dayBlockedSlots });
    } catch (err) {
      if (options.silent) throw err;
      if (requestId !== this._requestId) return;
      this.setData({ loadFailed: true });
    } finally {
      if (requestId === this._requestId) this.setData({ loading: false });
    }
  },

  openBlockModal() {
    this.setData({
      showBlockModal: true,
      blockStartTime: '14:00',
      blockEndTime: '16:00',
      blockReason: '私人事项',
      customReason: ''
    });
  },

  closeBlockModal() {
    this.setData({ showBlockModal: false });
  },

  preventBubble() {},

  onBlockStartTimeChange(e) {
    this.setData({ blockStartTime: e.detail.value });
  },

  onBlockEndTimeChange(e) {
    this.setData({ blockEndTime: e.detail.value });
  },

  selectBlockReason(e) {
    const reason = e.currentTarget.dataset.reason;
    this.setData({ blockReason: reason, customReason: '' });
  },

  onCustomReasonInput(e) {
    this.setData({ customReason: e.detail.value });
  },

  async confirmCreateBlockedSlot() {
    const startStr = `${this.data.selectedDate}T${this.data.blockStartTime}:00`;
    const endStr = `${this.data.selectedDate}T${this.data.blockEndTime}:00`;
    const start = new Date(startStr.replace(/-/g, '/'));
    const end = new Date(endStr.replace(/-/g, '/'));

    if (start >= end) {
      return wx.showToast({ title: '开始时间需早于结束时间', icon: 'none' });
    }

    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 15 * 60 * 1000) {
      return wx.showToast({ title: '锁档时长至少需 15 分钟', icon: 'none' });
    }

    const reason = (this.data.customReason || '').trim() || this.data.blockReason || '临时锁档';
    this.setData({ submittingBlock: true });
    try {
      await api.technician.bookingDays.createBlockedSlot({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        reason
      });
      wx.showToast({ title: '已临时锁档', icon: 'success' });
      this.setData({ showBlockModal: false });
      this.loadOrders(this.data.selectedDate, { silent: true });
    } catch (err) {
      wx.showToast({ title: err.message || '锁档失败', icon: 'none' });
    } finally {
      this.setData({ submittingBlock: false });
    }
  },

  onUnlockSlot(e) {
    const id = e.currentTarget.dataset.id;
    const slot = this.data.dayBlockedSlots.find(s => s.id === id);
    const timeText = slot ? slot.timeRange : '此时段';
    wx.showModal({
      title: '解锁该时段',
      content: `确定解锁 ${timeText} 吗？解锁后客户可正常预约该时段。`,
      confirmText: '确定解锁',
      cancelText: '取消',
      confirmColor: '#1D1D1F',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在解锁…' });
          try {
            await api.technician.bookingDays.deleteBlockedSlot(id);
            wx.showToast({ title: '已解锁恢复接单', icon: 'success' });
            this.loadOrders(this.data.selectedDate, { silent: true });
          } catch (err) {
            wx.showToast({ title: err.message || '解锁失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  onUnload() {
    this._requestId = (this._requestId || 0) + 1;
  },

  retryLoad() {
    this.loadOrders(this.data.selectedDate);
  }
});
