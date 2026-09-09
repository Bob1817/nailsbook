const VARIANTS = ['primary', 'secondary', 'text', 'danger'];

Component({
  properties: {
    label: { type: String, value: '' },
    variant: { type: String, value: 'primary' },
    loading: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    block: { type: Boolean, value: true },
    ariaLabel: { type: String, value: '' }
  },
  observers: {
    variant(value) {
      if (!VARIANTS.includes(value)) this.setData({ variant: 'primary' });
    }
  },
  methods: {
    onTap() {
      if (!this.data.disabled && !this.data.loading) this.triggerEvent('tap');
    }
  }
});
