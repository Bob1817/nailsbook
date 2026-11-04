const api = require('../../../services/api');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');
const { goHome: goEntryHome } = require('../../../utils/entry-navigation');

function normalizeCity(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/(市|特别行政区|地区|盟|自治州)$/, '');
}

function getCityHint(techCity, address) {
  techCity = techCity || '';
  var addrCity = (address && address.city) || '';
  var normTech = normalizeCity(techCity);
  var normAddr = normalizeCity(addrCity);

  if (!addrCity) {
    if (techCity) {
      return {
        isCrossCity: false,
        isSameCity: false,
        techCity: techCity,
        addrCity: '',
        hintText: '服务范围：限 ' + techCity + ' 及周边，具体路程与时间由美甲师沟通确认'
      };
    }
    return {
      isCrossCity: false,
      isSameCity: false,
      techCity: '',
      addrCity: '',
      hintText: '上门美甲服务范围及路程由美甲师沟通确认'
    };
  }

  if (normTech && normAddr) {
    if (normTech === normAddr) {
      return {
        isCrossCity: false,
        isSameCity: true,
        techCity: techCity,
        addrCity: addrCity,
        hintText: '同城上门 · 美甲师常驻 ' + techCity + '，路程费用由美甲师沟通确认'
      };
    }
    return {
      isCrossCity: true,
      isSameCity: false,
      techCity: techCity,
      addrCity: addrCity,
      hintText: '跨城提醒：当前地址（' + addrCity + '）与美甲师常驻城市（' + techCity + '）不一致，请提前确认是否支持跨城上门及路程费用'
    };
  }

  return {
    isCrossCity: false,
    isSameCity: false,
    techCity: techCity,
    addrCity: addrCity,
    hintText: '已选择 ' + addrCity + ' · 请与美甲师确认是否支持该区域上门'
  };
}

Page({
  data: {
    loading: true,
    submitting: false,
    quote: null,
    client: null,
    serviceDate: '',
    startTime: '',
    selectedAddress: null,
    selectedAddressId: 0,
    homeCityHint: null, homeQuote:null, homeQuoteError:'', homeQuoteLoading:false,
    error: ''
  },
  onLoad(options) {
    this.token = String(options.token || '');
    if (!this.loggedIn()) {
      const path = `/pages/client/quote-booking/index?token=${this.token}`;
      return wx.redirectTo({ url: buildClientLoginUrl(path, { source: 'booking_quote' }) });
    }
    this.load();
  },
  onShow() {
    const picked = wx.getStorageSync('client_selected_address');
    if (picked && picked.id && this.data.quote && this.data.quote.serviceType === '上门美甲') {
      wx.removeStorageSync('client_selected_address');
      this.setData({
        selectedAddress: picked,
        selectedAddressId: picked.id
      });
      this.updateHomeCityHint(picked);
      this.refreshHomeQuote();
    }
    if (this.data.quote && this.data.quote.serviceType === '上门美甲') this.loadDefaultAddress();
  },
  onHide() { this._homeQuoteToken = (this._homeQuoteToken || 0) + 1; },
  loggedIn() {
    const app = getApp();
    if ((wx.getStorageSync('role') || app.globalData.role) !== 'client') return false;
    const token = wx.getStorageSync('client_token') || app.globalData.token;
    if (!token) return false;
    // 过期登录态视为未登录：走登录跳转并保留预约页回跳，避免提交时 401 清态后丢失上下文
    const expiresAt = typeof app.getTokenExpiresAt === 'function' ? app.getTokenExpiresAt(token) : 0;
    return !(expiresAt > 0 && expiresAt <= Date.now());
  },
  goHome() {
    goEntryHome();
  },
  chooseAddress() {
    wx.navigateTo({ url: '/pages/client/addresses/index?mode=select' });
  },
  updateHomeCityHint(address) {
    const quote = this.data.quote;
    const techCity = (quote && (quote.technicianCity || quote.technicianServiceArea)) || '';
    const addr = address !== undefined ? address : this.data.selectedAddress;
    this.setData({ homeCityHint: getCityHint(techCity, addr) });
  },
  async loadDefaultAddress() {
    if (!this.data.quote || this.data.quote.serviceType !== '上门美甲') return;
    try {
      const res = await api.client.addresses.list();
      const list = res.list || res.data || res || [];
      const def = list.find(a => String(a.id) === String(this.data.selectedAddressId)) || (list.length === 1 ? list[0] : null);
      if (def) {
        this.setData({ selectedAddress: def, selectedAddressId: def.id });
        this.updateHomeCityHint(def);
      } else this.setData({ selectedAddress:null, selectedAddressId:0 });
      this.refreshHomeQuote();
    } catch (e) {
      this.setData({ homeQuote:null, homeQuoteError:'地址加载失败，请重新选择' });
    }
  },
  async refreshHomeQuote() {
    const token=(this._homeQuoteToken || 0)+1; this._homeQuoteToken=token;
    this.setData({ homeQuote:null, homeQuoteError:'', homeQuoteLoading:false });
    if (!this.data.quote || this.data.quote.serviceType !== '上门美甲' || !this.data.selectedAddressId) return;
    this.setData({ homeQuoteLoading:true });
    try {
      const result=await api.client.orders.homeServiceQuote(this.data.quote.technicianId,this.data.selectedAddressId);
      if (token===this._homeQuoteToken) this.setData({ homeQuote:{ ...result, feeText:(result.feeFen/100).toFixed(2), totalText:((this.data.quote.finalPriceFen + result.feeFen)/100).toFixed(2) } });
    } catch (err) { if (token===this._homeQuoteToken) this.setData({ homeQuoteError:err.message || '上门费计算失败' }); }
    finally { if (token===this._homeQuoteToken) this.setData({ homeQuoteLoading:false }); }
  },
  editSelectedAddress() { wx.navigateTo({ url:'/pages/client/address-edit/index?id='+this.data.selectedAddressId+'&requireLocation=1&select=1' }); },
  async load() {
    try {
      const quote = await api.public.bookingQuotes.detail(this.token);
      if (quote.status === 'booked') return wx.redirectTo({ url: `/pages/client/quote-confirm/index?token=${this.token}` });
      if (quote.status !== 'accepted_pending_schedule') throw new Error('请先确认报价后再预约');
      this.setData({ quote, loading: false, error: '' });
      this.updateHomeCityHint();
      this.loadClient();
      if (quote.serviceType === '上门美甲') {
        this.loadDefaultAddress();
      }
    } catch (err) { this.setData({ loading: false, error: err.message || '预约信息加载失败' }); }
  },
  async loadClient() {
    try {
      const result = await api.auth.getUserInfo('client');
      const client = result.client || result;
      const phone = String(client.phone || '');
      this.setData({ client: { displayName: client.nickname || client.phone || '客户', phoneText: phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone } });
    } catch (err) { /* 客户信息仅用于展示，加载失败不阻断预约 */ }
  },
  onBookingTimeChange(e) { this.setData({ serviceDate: e.detail.serviceDate, startTime: e.detail.startTime }); },
  async submit() {
    if (!this.data.startTime || this.data.submitting) return wx.showToast({ title: '请选择预约日期和时间', icon: 'none' });
    if (this.data.quote && this.data.quote.serviceType === '上门美甲' && !this.data.selectedAddressId) {
      return wx.showToast({ title: '请选择上门服务地址', icon: 'none' });
    }
    if (this.data.quote.serviceType === '上门美甲' && (!this.data.homeQuote || this.data.homeQuoteLoading || this.data.homeQuoteError)) return wx.showToast({ title:this.data.homeQuoteError || '请确认上门费用后预约', icon:'none' });
    this.setData({ submitting: true });
    try {
      await api.client.bookingQuotes.book(this.token, {
        expectedHomeServiceFeeFen:this.data.homeQuote ? this.data.homeQuote.feeFen : undefined,
        version: this.data.quote.version,
        serviceDate: this.data.serviceDate,
        startTime: this.data.startTime,
        addressId: this.data.quote.serviceType === '上门美甲' ? this.data.selectedAddressId : undefined
      });
      wx.redirectTo({ url: `/pages/client/quote-confirm/index?token=${this.token}&justBooked=1` });
    } catch (err) { this.setData({ submitting: false }); wx.showToast({ title: err.message || '预约提交失败', icon: 'none' }); }
  }
});
