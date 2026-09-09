Component({
  options: { multipleSlots: true },
  properties: {
    label: { type: String, value: '' },
    icon: { type: String, value: '' },
    value: { type: String, value: '' },
    type: { type: String, value: 'text' },
    password: { type: Boolean, value: false },
    maxlength: { type: Number, value: 140 },
    placeholder: { type: String, value: '' },
    disabled: { type: Boolean, value: false },
    actionText: { type: String, value: '' },
    actionDisabled: { type: Boolean, value: false },
    hint: { type: String, value: '' },
    error: { type: String, value: '' }
  },
  data: { focused: false },
  methods: {
    onInput(event) { this.triggerEvent('input', event.detail); },
    onFocus(event) {
      this.setData({ focused: true });
      this.triggerEvent('focus', event.detail);
    },
    onBlur(event) {
      this.setData({ focused: false });
      this.triggerEvent('blur', event.detail);
    },
    onConfirm(event) { this.triggerEvent('confirm', event.detail); },
    onAction() {
      if (!this.data.actionDisabled) this.triggerEvent('action');
    }
  }
});
