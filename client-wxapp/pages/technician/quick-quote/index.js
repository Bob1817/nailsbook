const api = require('../../../services/api');

function money(fen) { return (Number(fen || 0) / 100).toFixed(2); }
function servicePriceFen(service) { return Math.round(Number(service.price || 0) * 100); }
function formatDuration(minutes) {
  const value = Number(minutes || 0);
  if (value > 0 && value % 60 === 0) return `${value / 60}小时`;
  return `${value}分钟`;
}
function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
function decorateQuote(quote) {
  const statusLabels = {
    issued: '待查看', viewed: '已查看', accepted_pending_schedule: '待选时间',
    booked: '已预约', withdrawn: '已撤回', expired: '已过期'
  };
  return {
    ...quote,
    _statusLabel: statusLabels[quote.status] || quote.status,
    _priceText: money(quote.finalPriceFen),
    _dateText: formatDate(quote.createdAt || quote.issuedAt),
    _expiresText: formatDate(quote.expiresAt)
  };
}

Page({
  data: {
    loading: true,
    submitting: false,
    requirement: '',
    services: [],
    serviceQuantities: {},
    draftServiceQuantities: {},
    temporaryFee: { name: '', price: '' },
    selectedServices: [],
    servicePickerCount: 0,
    servicePickerDurationText: '0分钟',
    servicePickerTotalText: '0.00',
    otherFees: [],
    displayFees: [],
    quoteLines: [],
    calculatedFen: 0,
    calculatedText: '0.00',
    duration: 0,
    durationText: '0分钟',
    durationInput: '',
    durationError: false,
    quoteItemCount: 0,
    finalPrice: '',
    finalPriceError: false,
    feeNameError: false,
    feePriceError: false,
    showServicePicker: false,
    showMore: false,
    quote: null
  },

  async onLoad(options = {}) {
    try {
      const serviceResult = await api.technician.services.list();
      const services = (serviceResult.list || serviceResult.data || serviceResult || [])
        .filter(item => item.isActive !== false && item.isBookable !== false && item.price !== null && item.price !== undefined)
        .map(item => ({
          ...item,
          _priceText: Number(item.price || 0).toFixed(2),
          _pickerPriceText: String(Number(item.price || 0)),
          _pickerCategory: ({ basic_care: '基础服务', color_style: '美甲设计', extension_reinforcement: '进阶服务', removal: '基础服务', surcharge_home: '上门服务费', surcharge_night: '晚间服务费', surcharge_holiday: '假日服务费' })[item.category] || '美甲服务'
        }));
      this.setData({ services, loading: false });
      if (options.quoteId) {
        const quote = await api.technician.bookingQuotes.detail(Number(options.quoteId));
        const serviceQuantities = {};
        quote.lines.filter(item => item.lineType === 'service').forEach(item => {
          serviceQuantities[item.servicePublicIdSnapshot] = item.quantity;
        });
        this.setData({
          serviceQuantities,
          otherFees: quote.lines.filter(item => item.lineType !== 'service').map(item => ({ name: item.nameSnapshot, price: money(item.subtotalFen) })),
          requirement: quote.requirement || ''
        });
        this.syncSelectedServices();
        this.recalculate();
        this.setData({
          finalPrice: money(quote.finalPriceFen),
          duration: quote.totalDurationMinutes,
          durationInput: this.formatDurationInput(quote.totalDurationMinutes),
          durationText: formatDuration(quote.totalDurationMinutes)
        });
      }
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '服务加载失败', icon: 'none' });
    }
  },

  noop() {},
  newQuote() {
    this.setData({
      quote: null,
      requirement: '',
      serviceQuantities: {},
      draftServiceQuantities: {},
      temporaryFee: { name: '', price: '' },
      selectedServices: [],
      otherFees: [],
      displayFees: [],
      quoteLines: [],
      calculatedFen: 0,
      calculatedText: '0.00',
      duration: 0,
      durationText: '0分钟',
      durationInput: '',
      durationError: false,
      quoteItemCount: 0,
      finalPrice: '',
      finalPriceError: false,
      feeNameError: false,
      feePriceError: false,
      showServicePicker: false,
      showMore: false
    });
  },
  toggleMore() { this.setData({ showMore: !this.data.showMore }); },
  input(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const patch = { [field]: value };
    if (field === 'finalPrice') {
      const num = Number(value);
      patch.finalPriceError = value !== '' && (!Number.isFinite(num) || Math.round(num * 100) > this.data.calculatedFen);
    }
    this.setData(patch);
  },
  formatDurationInput(minutes) {
    const value = Number(minutes || 0);
    if (!value) return '';
    return String(Number((value / 60).toFixed(2)));
  },
  onDurationInput(e) {
    const raw = String(e.detail.value || '').trim();
    const num = Number(raw);
    const valid = raw !== '' && Number.isFinite(num) && num > 0;
    this.setData({
      duration: valid ? Math.round(num * 60) : 0,
      durationInput: raw,
      durationError: raw !== '' && !valid
    });
  },

  openServicePicker() {
    this.setData({
      showServicePicker: true,
      draftServiceQuantities: { ...this.data.serviceQuantities }
    });
    this.updateServicePickerSummary();
  },
  closeServicePicker() { this.setData({ showServicePicker: false }); },
  changeDraftServiceQuantity(e) {
    const id = String(e.currentTarget.dataset.id);
    const delta = Number(e.currentTarget.dataset.delta || 0);
    const draft = { ...this.data.draftServiceQuantities };
    const quantity = Math.max(0, Math.min(99, Number(draft[id] || 0) + delta));
    if (quantity) draft[id] = quantity;
    else delete draft[id];
    this.setData({ draftServiceQuantities: draft });
    this.updateServicePickerSummary();
  },
  updateServicePickerSummary() {
    let count = 0;
    let totalFen = 0;
    let duration = 0;
    this.data.services.forEach(item => {
      const quantity = Number(this.data.draftServiceQuantities[String(item.id)] || 0);
      count += quantity;
      totalFen += servicePriceFen(item) * quantity;
      duration += Number(item.durationMinutes || 0) * quantity;
    });
    this.setData({ servicePickerCount: count, servicePickerTotalText: money(totalFen), servicePickerDurationText: formatDuration(duration) });
  },
  confirmServicePicker() {
    if (!this.data.servicePickerCount) return;
    const serviceQuantities = { ...this.data.draftServiceQuantities };
    this.setData({ serviceQuantities, showServicePicker: false });
    this.syncSelectedServices();
    this.recalculate();
  },
  changeSelectedServiceQuantity(e) {
    const id = String(e.currentTarget.dataset.id);
    const delta = Number(e.currentTarget.dataset.delta || 0);
    const serviceQuantities = { ...this.data.serviceQuantities };
    const current = Number(serviceQuantities[id] || 0);
    if (delta < 0 && current === 1) {
      wx.showModal({
        title: '移除服务项目',
        content: '确定从本次报价中去掉该服务吗？',
        confirmText: '移除',
        success: result => {
          if (!result.confirm) return;
          const next = { ...this.data.serviceQuantities };
          delete next[id];
          this.setData({ serviceQuantities: next });
          this.syncSelectedServices();
          this.recalculate();
        }
      });
      return;
    }
    serviceQuantities[id] = Math.min(99, current + delta);
    this.setData({ serviceQuantities });
    this.syncSelectedServices();
    this.recalculate();
  },
  syncSelectedServices() {
    const selectedServices = this.data.services
      .map(item => {
        const quantity = Number(this.data.serviceQuantities[String(item.id)] || 0);
        if (!quantity) return null;
        const subtotalFen = servicePriceFen(item) * quantity;
        return { ...item, quantity, _subtotalText: money(subtotalFen) };
      })
      .filter(Boolean);
    this.setData({ selectedServices });
  },

  editTemporaryFee(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      temporaryFee: { ...this.data.temporaryFee, [field]: e.detail.value },
      ...(field === 'name' ? { feeNameError: false } : { feePriceError: false })
    });
  },
  addTemporaryFee() {
    const fee = this.data.temporaryFee;
    const nameValid = !!fee.name.trim();
    const priceValid = Number.isFinite(Number(fee.price)) && Number(fee.price) > 0;
    if (!nameValid || !priceValid) {
      this.setData({ feeNameError: !nameValid, feePriceError: !priceValid });
      return wx.showToast({ title: !nameValid ? '请填写项目名称' : '请填写有效金额', icon: 'none' });
    }
    this.setData({
      otherFees: this.data.otherFees.concat([{ name: fee.name.trim(), price: fee.price }]),
      temporaryFee: { name: '', price: '' },
      feeNameError: false,
      feePriceError: false
    });
    this.recalculate(false);
  },
  removeFee(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ otherFees: this.data.otherFees.filter((_, itemIndex) => itemIndex !== index) });
    this.recalculate(false);
  },

  recalculate(resetDuration = true) {
    let calculatedFen = 0;
    let duration = 0;
    const quoteLines = [];
    this.data.services.forEach(item => {
      const quantity = Number(this.data.serviceQuantities[String(item.id)] || 0);
      if (!quantity) return;
      const subtotalFen = servicePriceFen(item) * quantity;
      const lineDuration = Number(item.durationMinutes || 0) * quantity;
      calculatedFen += subtotalFen;
      duration += lineDuration;
      quoteLines.push({
        key: `service-${item.id}`,
        name: item.name,
        subtotalText: money(subtotalFen),
        duration: lineDuration,
        quantity
      });
    });
    // 临时收费项目仅在点击【添加】后进入服务项目列表
    const displayFees = this.data.otherFees.map(item => {
      const price = Number(item.price);
      const subtotalFen = Number.isFinite(price) && price > 0 ? Math.round(price * 100) : 0;
      return { ...item, _subtotalFen: subtotalFen, _subtotalText: money(subtotalFen) };
    });
    displayFees.forEach((item, index) => {
      const subtotalFen = item._subtotalFen;
      calculatedFen += subtotalFen;
      quoteLines.push({ key: `fee-${index}`, name: item.name.trim() || '临时收费项目', subtotalText: money(subtotalFen), duration: 0, quantity: 1 });
    });
    const nextDuration = resetDuration ? duration : this.data.duration;
    this.setData({
      calculatedFen,
      calculatedText: money(calculatedFen),
      duration: nextDuration,
      durationText: formatDuration(duration),
      quoteItemCount: quoteLines.length,
      quoteLines,
      displayFees,
      finalPrice: money(calculatedFen),
      finalPriceError: false,
      ...(resetDuration ? { durationInput: this.formatDurationInput(duration), durationError: false } : {}),
      ...(!this.data.selectedServices.length && !this.data.otherFees.length ? { showMore: false, finalPrice: '' } : {})
    });
  },

  async submit() {
    if (!this.data.selectedServices.length || this.data.submitting) return;
    const pendingFee = this.data.temporaryFee;
    if (pendingFee.name.trim() || pendingFee.price !== '') {
      return wx.showToast({ title: '请先点击【添加】加入临时收费项目', icon: 'none' });
    }
    const serviceLines = this.data.services
      .map(item => ({ item, quantity: Number(this.data.serviceQuantities[String(item.id)] || 0) }))
      .filter(entry => entry.quantity > 0)
      .map(entry => ({ lineType: 'service', servicePublicId: entry.item.id, quantity: entry.quantity }));
    const feeLines = this.data.displayFees
      .filter(item => item.name.trim() && Number(item.price || 0) > 0)
      .map(item => ({
        lineType: 'surcharge',
        name: item.name.trim(),
        unitPriceFen: Math.round(Number(item.price || 0) * 100),
        quantity: 1,
        durationMinutes: 0
      }));
    if (!serviceLines.length) return wx.showToast({ title: '请先选择报价服务项目', icon: 'none' });
    if (!this.data.duration) return wx.showToast({ title: '预计服务时长不能为 0', icon: 'none' });
    const finalPriceFen = this.data.finalPrice === '' ? this.data.calculatedFen : Math.round(Number(this.data.finalPrice) * 100);
    if (!(finalPriceFen > 0)) return wx.showToast({ title: '请输入有效的最终报价', icon: 'none' });
    if (finalPriceFen > this.data.calculatedFen) {
      this.setData({ finalPriceError: true });
      return wx.showToast({ title: `最终报价不能高于项目合计 ¥${this.data.calculatedText}`, icon: 'none' });
    }
    this.setData({ submitting: true });
    try {
      const quote = await api.technician.bookingQuotes.create({
        requirement: this.data.requirement.trim() || undefined,
        lines: serviceLines.concat(feeLines),
        finalPriceFen,
        totalDurationMinutes: Number(this.data.duration)
      });
      this.setData({ quote: decorateQuote(quote), submitting: false });
      wx.navigateTo({ url: `/pages/client/quote-confirm/index?id=${quote.id}` });
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    }
  },

  onShareAppMessage() {
    const quote = this.data.quote;
    if (!quote) return { title: 'OnlyNail 专属报价确认函', path: '/pages/technician/quick-quote/index' };
    return { title: `${quote.technicianName} 为你准备了专属报价`, path: quote.sharePath };
  }
});
