Component({
  options: { virtualHost: true },
  properties: {
    checked: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    label: { type: String, value: '开关' }
  },
  methods: {
    onTap() {
      if (this.data.disabled) return;
      this.triggerEvent('change', { value: !this.data.checked });
    }
  }
});
