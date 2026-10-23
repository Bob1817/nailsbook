Component({
  properties: {
    order: { type: Object, value: {} },
    variant: { type: String, value: 'compact' }
  },
  data: { confirming: null },
  methods: {
    open() { this.triggerEvent('open', { id: this.data.order.id }); },
    navigate() { this.triggerEvent('navigate', { id: this.data.order.id }); },
    contact() { this.triggerEvent('contact', { phone: this.data.order.customerPhone }); },
    message() { this.triggerEvent('message', { clientId: this.data.order.clientUserId || (this.data.order.customer && this.data.order.customer.clientUserId), id: this.data.order.id, customerId: this.data.order.customerId || (this.data.order.customer && this.data.order.customer.id) }); },
    refuse() { this.triggerEvent('refuse', { id: this.data.order.id }); },
    confirm() {
      if (this.data.variant === 'confirmation') {
        this.triggerEvent('confirm', { id: this.data.order.id });
        return;
      }
      // 待我确认：列表卡片内直接打开确认排期弹层
      this.setData({ confirming: this.data.order });
    },
    closeConfirmDialog() { this.setData({ confirming: null }); },
    onConfirmDialogSaved() { this.setData({ confirming: null }); this.triggerEvent('confirmed', { id: this.data.order.id }); },
    quote() { this.triggerEvent('quote', { id: this.data.order.id }); },
    withdrawQuote() { this.triggerEvent('withdrawquote', { id: this.data.order.id }); },
    editBooking() { this.triggerEvent('editbooking', { id: this.data.order.id }); },
    reject() { this.triggerEvent('reject', { id: this.data.order.id }); },
    cancel() { this.triggerEvent('cancel', { id: this.data.order.id }); },
    complete() { this.triggerEvent('complete', { id: this.data.order.id }); },
    rebook() { this.triggerEvent('rebook', { id: this.data.order.id }); }
  }
});
