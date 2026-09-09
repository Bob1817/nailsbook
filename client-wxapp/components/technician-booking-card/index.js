Component({
  properties: {
    order: { type: Object, value: {} },
    variant: { type: String, value: 'compact' }
  },
  methods: {
    open() { this.triggerEvent('open', { id: this.data.order.id }); },
    navigate() { this.triggerEvent('navigate', { id: this.data.order.id }); },
    contact() { this.triggerEvent('contact', { phone: this.data.order.customerPhone }); },
    message() { this.triggerEvent('message', { clientId: this.data.order.clientUserId || (this.data.order.customer && this.data.order.customer.clientUserId), id: this.data.order.id, customerId: this.data.order.customerId || (this.data.order.customer && this.data.order.customer.id) }); },
    refuse() { this.triggerEvent('refuse', { id: this.data.order.id }); },
    confirm() { this.triggerEvent('confirm', { id: this.data.order.id }); }
  }
});
