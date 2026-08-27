Component({
  properties: {
    order: { type: Object, value: {} },
    variant: { type: String, value: 'compact' }
  },
  methods: {
    open() { this.triggerEvent('open', { id: this.data.order.id }); },
    navigate() { this.triggerEvent('navigate', { id: this.data.order.id }); },
    contact() { this.triggerEvent('contact', { phone: this.data.order.customerPhone }); },
    message() { this.triggerEvent('message', { id: this.data.order.id, customerId: this.data.order.customerId || (this.data.order.customer && this.data.order.customer.id) }); }
  }
});
