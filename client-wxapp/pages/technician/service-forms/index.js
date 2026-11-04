const colors = require('../../../utils/colors');
const api = require('../../../services/api');
const location = require('../utils/location');
const { homeSettings, formIssues } = require('../utils/service-forms');
const { DAY_KEYS, DAY_LABELS } = require('../../../utils/workSchedule');

Page({
  data: { colors, loading:true, loadFailed:false, saving:false, editor:'', homeAreaText:'', homeFeeText:'', homeTimeText:'', acceptingMode:false, shopService:false, homeService:false,
    shops:[], region:[], origin:null, tiers:[{ key:'initial', maxKm:'', fee:'' }], days:[], dayOptions:DAY_KEYS.map(key => ({ key, label:DAY_LABELS[key], selected:false })),
    startTime:'', endTime:'', shopIssues:[], homeIssues:[], error:'', status:'inactive', choosingOrigin:false },
  onLoad(options) { this._unloaded = false; this.setData({ acceptingMode:options && options.mode === 'accept' }); },
  onShow() { this._active = true; this.load(); },
  onHide() { this._active = false; },
  onUnload() { this._active = false; this._unloaded = true; },
  async load() {
    if (this._loading) return;
    this._loading = true;
    try {
      const user = await api.technician.auth.getUserInfo();
      if (!this._active) return;
      this._user = user;
      const c = homeSettings(user.homeServiceSettings);
      const updates = { loading:false, loadFailed:false, shops:(user.shopAddresses || []).filter(s => s.enabled !== false), status:user.status, shopService:!!user.shopService, homeService:!!user.homeService };
      if (!this._dirty) Object.assign(updates, {
        region:c.city ? [c.province, c.city, c.district || '全部'] : [], origin:c.origin || null,
        tiers:c.tiers && c.tiers.length ? c.tiers.map((t, index) => ({ key:'saved-'+index, maxKm:String(t.maxKm), fee:String(t.feeFen / 100) })) : [{ key:'initial', maxKm:'', fee:'' }],
        days:c.days || [], startTime:c.startTime || '', endTime:c.endTime || '' });
      this.setData(updates);
      this.refresh();
    } catch (error) { if (this._active) this.setData({ loading:false, loadFailed:true, error:error.message || '服务形式加载失败' }); }
    finally { this._loading = false; }
  },
  config() {
    const d = this.data;
    return { province:d.region[0] || '', city:d.region[1] || '', district:d.region[2] === '全部' ? '' : (d.region[2] || ''),
      origin:d.origin || undefined, tiers:d.tiers.map(t => ({ maxKm:t.maxKm === '' ? NaN : Number(t.maxKm), feeFen:t.fee === '' ? NaN : Math.round(Number(t.fee) * 100) })),
      days:d.days, startTime:d.startTime, endTime:d.endTime };
  },
  refresh() {
    const user = { ...this._user, homeServiceSettings:this.config() };
    const saved = homeSettings(this._user && this._user.homeServiceSettings);
    this.setData({ shopIssues:formIssues(user, 'shop'), homeIssues:formIssues(user, 'home'),
      dayOptions:DAY_KEYS.map(key => ({ key, label:DAY_LABELS[key], selected:this.data.days.includes(key) })),
      homeAreaText:[saved.province, saved.city, saved.district].filter(Boolean).join(' '),
      homeFeeText:(saved.tiers || []).map((t,i,tiers) => (i ? tiers[i-1].maxKm + '–' : '0–') + t.maxKm + 'km：¥' + (t.feeFen / 100).toFixed(2)).join('；'),
      homeTimeText:(saved.days || []).map(key => DAY_LABELS[key]).join('、') + ' ' + (saved.startTime || '') + '–' + (saved.endTime || '') });
  },
  onShopSwitch(e) { if (!this.data.saving) return e.detail.value ? this.openEditor('shop') : this.disable('shop'); },
  onHomeSwitch(e) { if (!this.data.saving) return e.detail.value ? this.openEditor('home') : this.disable('home'); },
  editShop() { this.openEditor('shop'); },
  editHome() { this.openEditor('home'); },
  openEditor(type) {
    if (this.data.saving) return;
    this._dirty = false;
    this.setData({ editor:type, error:'' });
    this.refresh();
  },
  cancelEdit() {
    if (this.data.saving || this.data.choosingOrigin) return;
    this._dirty = false;
    this.setData({ editor:'', error:'' });
    this.load();
  },
  disable(type) {
    wx.showModal({ title:type === 'shop' ? '关闭到店美甲？' : '关闭上门美甲？', content:'关闭后客户无法新预约此服务形式，已有预约不受影响。',
      success:res => { if (res.confirm) this.persist(type, false); } });
  },
  changeRegion(e) { this._dirty = true; this.setData({ region:e.detail.value }); this.refresh(); },
  changeDays(e) { this._dirty = true; this.setData({ days:e.detail.value }); this.refresh(); },
  changeTime(e) { this._dirty = true; this.setData({ [e.currentTarget.dataset.field]:e.detail.value }); this.refresh(); },
  changeTier(e) {
    this._dirty = true;
    const tiers = this.data.tiers.map((t, i) => i === Number(e.currentTarget.dataset.index) ? { ...t, [e.currentTarget.dataset.field]:e.detail.value } : t);
    this.setData({ tiers }); this.refresh();
  },
  addTier() { if (this.data.tiers.length >= 10) return; this._dirty = true; this._tierId=(this._tierId || 0)+1; this.setData({ tiers:[...this.data.tiers, { key:'added-'+this._tierId, maxKm:'', fee:'' }] }); this.refresh(); },
  removeTier(e) { if (this.data.tiers.length <= 1) return; this._dirty = true; this.setData({ tiers:this.data.tiers.filter((_, i) => i !== Number(e.currentTarget.dataset.index)) }); this.refresh(); },
  chooseOrigin() {
    if (this.data.saving || this.data.choosingOrigin) return;
    this.setData({ choosingOrigin:true });
    location.selectLocation(this.data.origin, res => {
      if (this._unloaded) return;
      this._dirty = true;
      this.setData({ origin:{ latitude:res.latitude, longitude:res.longitude, address:res.address || res.name } }); this.refresh();
    }, () => { if (!this._unloaded) this.setData({ choosingOrigin:false }); });
  },
  manageShops() { wx.navigateTo({ url:'/pages/technician/shop-management/index' }); },
  manageSchedule() { wx.navigateTo({ url:'/pages/technician/profile/index?editSchedule=1' }); },
  async save() {
    if (this.data.saving || this.data.choosingOrigin || this.data.loading || this.data.loadFailed || !this.data.editor) return;
    this.refresh();
    const type = this.data.editor;
    const issues = type === 'shop' ? this.data.shopIssues : this.data.homeIssues;
    if (issues.length) { this.setData({ error:issues[0] }); return wx.showToast({ title:issues[0], icon:'none' }); }
    return this.persist(type, true);
  },
  async persist(type, enabled) {
    if (this.data.saving || this.data.loading || this.data.loadFailed) return;
    const flag = type === 'shop' ? 'shopService' : 'homeService';
    const payload = { [flag]:enabled };
    if (type === 'home' && enabled) payload.homeServiceSettings = this.config();
    this.setData({ saving:true, error:'' });
    try {
      const result = await api.technician.auth.updateServiceType(payload);
      this._user = { ...this._user, ...result, [flag]:enabled };
      wx.setStorageSync('userInfo', this._user); wx.setStorageSync('technician_userInfo', this._user);
      if (this._unloaded) return;
      this._dirty = false;
      this.setData({ [flag]:enabled, status:this._user.status, editor:'' });
      this.refresh();
      wx.showToast({ title:enabled ? '已保存并开启' : '已关闭', icon:'success' });
    } catch (error) { if (!this._unloaded) this.setData({ error:error.message || '保存失败，请重试' }); }
    finally { if (!this._unloaded) this.setData({ saving:false }); }
  },
  async activate() {
    if (this.data.saving || this.data.loading || this.data.loadFailed) return;
    const user = this._user || {};
    const issues = [...(user.shopService ? formIssues(user,'shop') : []), ...(user.homeService ? formIssues(user,'home') : [])];
    if (!user.shopService && !user.homeService) issues.unshift('请先配置并开启至少一种服务形式');
    if (issues.length) { this.setData({ error:issues[0] }); return; }
    this.setData({ saving:true, error:'' });
    try {
      await api.technician.auth.updateStatus('active', { shopService:!!user.shopService, homeService:!!user.homeService });
      this._user.status = 'active'; wx.setStorageSync('userInfo',this._user); wx.setStorageSync('technician_userInfo',this._user);
      wx.showToast({ title:'已开启接单', icon:'success' }); wx.navigateBack();
    } catch (error) { if (!this._unloaded) this.setData({ error:error.message || '开启接单失败，请重试' }); }
    finally { if (!this._unloaded) this.setData({ saving:false }); }
  }
});
