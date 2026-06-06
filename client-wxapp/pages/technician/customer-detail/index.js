const api = require('../../../services/api');
const { formatMoney, formatBookingDate, parseDate } = require('../../../utils/format');
const { getStatusLabel, getStatusTone } = require('../../../utils/order');

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  const s = String(raw).trim();
  if (s.startsWith('[')) {
    try { const a = JSON.parse(s); if (Array.isArray(a)) return a.filter(Boolean); } catch (e) {}
  }
  return s.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
}

function isPhoneLikeName(name) {
  return /^1\d{10}$/.test(String(name || '').trim());
}
function maskPhone(phone) {
  const p = String(phone || '');
  if (p.length < 7) return p;
  return p.slice(0, 3) + '****' + p.slice(-4);
}
function genderText(g) {
  if (g === 'male' || g === '男') return '男';
  if (g === 'female' || g === '女') return '女';
  return '';
}

Page({
  data: {
    customer: null,
    loading: true,

    allTags: [],          // 该技师所有 distinct 标签

    // 标签编辑弹层
    showTagEdit: false,
    editTags: [],
    availableTags: [],
    newTag: '',
    savingTags: false
  },

  onLoad(options) {
    this.customerId = options.id;
    this.loadAllTags();
    this.loadCustomer();
  },

  onShow() {
    if (this.customerId && !this.data.loading) this.loadCustomer();
  },

  onPullDownRefresh() {
    this.loadCustomer().finally(() => wx.stopPullDownRefresh());
  },

  async loadAllTags() {
    try {
      const res = await api.technician.customers.tags();
      const tags = Array.isArray(res) ? res : (res.data || []);
      this.setData({ allTags: tags.filter(Boolean) });
    } catch (e) { /* 容错 */ }
  },

  // ---------- 详情 ----------
  async loadCustomer() {
    this.setData({ loading: true });
    try {
      const raw = await api.technician.customers.detail(this.customerId);

      const orders = (raw.orders || []).map((o) => ({
        ...o,
        _statusLabel: getStatusLabel(o.status),
        _statusTone: getStatusTone(o.status),
        _dateStr: (o.startTime || o.createdAt || '').slice(0, 10)
      }));

      const revenues = raw.revenues || [];
      const totalSpent = revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);

      // 最近服务：orders 已按 startTime desc 排序
      const recent = orders.length ? (orders[0].startTime || orders[0].createdAt) : null;
      const recentDate = parseDate(recent);

      const tags = parseTags(raw.tags);
      const phoneLike = isPhoneLikeName(raw.name);

      const customer = {
        ...raw,
        orders,
        _tags: tags,
        _displayName: phoneLike ? '未设置名称' : (raw.name || '未设置名称'),
        _initial: phoneLike ? '客' : ((raw.name && raw.name[0]) || '客'),
        _phoneMasked: maskPhone(raw.phone),
        _genderText: genderText(raw.gender),
        _birthdayText: raw.birthday ? String(raw.birthday).slice(0, 10) : '',
        _totalSpentText: totalSpent > 0 ? formatMoney(totalSpent) : '¥0',
        _totalOrders: orders.length,
        _recentLabel: recentDate
          ? `${recentDate.getMonth() + 1}/${recentDate.getDate()}`
          : '暂无'
      };

      this.setData({ customer, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // ---------- 交互 ----------
  callCustomer() {
    const phone = this.data.customer && this.data.customer.phone;
    if (!phone) return wx.showToast({ title: '暂无电话', icon: 'none' });
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  copyAddress() {
    const addr = this.data.customer && this.data.customer.address;
    if (!addr) return;
    wx.setClipboardData({
      data: addr,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  goOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  newOrder() {
    wx.navigateTo({
      url: `/pages/technician/orders/index?action=new&customerId=${this.customerId}`
    });
  },

  // ---------- 标签编辑 ----------
  openTagEdit() {
    const editTags = [...this.data.customer._tags];
    this.setData({ showTagEdit: true, editTags, newTag: '' });
    this._recalcAvailable(editTags);
  },
  closeTagEdit() { this.setData({ showTagEdit: false }); },

  _recalcAvailable(editTags) {
    const available = this.data.allTags.filter((t) => editTags.indexOf(t) < 0);
    this.setData({ availableTags: available });
  },

  removeTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const editTags = this.data.editTags.filter((t) => t !== tag);
    this.setData({ editTags });
    this._recalcAvailable(editTags);
  },

  addExistingTag(e) {
    const tag = e.currentTarget.dataset.tag;
    if (this.data.editTags.indexOf(tag) >= 0) return;
    const editTags = [...this.data.editTags, tag];
    this.setData({ editTags });
    this._recalcAvailable(editTags);
  },

  onNewTagInput(e) { this.setData({ newTag: e.detail.value }); },

  addNewTag() {
    const tag = (this.data.newTag || '').trim();
    if (!tag) return;
    if (this.data.editTags.indexOf(tag) >= 0) {
      this.setData({ newTag: '' });
      return;
    }
    const editTags = [...this.data.editTags, tag];
    this.setData({ editTags, newTag: '' });
    this._recalcAvailable(editTags);
  },

  async saveTags() {
    if (this.data.savingTags) return;
    this.setData({ savingTags: true });
    // 后端 tags 字段是 String，传逗号分隔字符串
    const tagString = this.data.editTags.join(',');
    try {
      await api.technician.customers.updateTags(this.customerId, tagString);
      this.setData({
        savingTags: false,
        showTagEdit: false,
        'customer._tags': [...this.data.editTags],
        'customer.tags': tagString
      });
      wx.showToast({ title: '标签已更新', icon: 'success' });
      this.loadAllTags();
    } catch (err) {
      this.setData({ savingTags: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  }
});
