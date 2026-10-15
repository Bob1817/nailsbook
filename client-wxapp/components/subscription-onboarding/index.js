Component({
  properties: {
    visible: { type: Boolean, value: false },
    role: { type: String, value: 'client' },
    loading: { type: Boolean, value: false }
  },

  methods: {
    close() {
      if (!this.data.loading) this.triggerEvent('close');
    },
    enable() {
      if (!this.data.loading) this.triggerEvent('enable');
    },
    preventBubble() {}
  }
});
