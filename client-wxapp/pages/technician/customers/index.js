const api = require('../../../services/api');

const TABS = ['全部', '常客', '新客', '高频'];

const TAG_COLORS = {
  '常客': { bg: '#FFE9F0', text: '#FF5E93' },
  '新客': { bg: '#EBF4FF', text: '#3B82F6' },
  '高频': { bg: '#FFF1E5', text: '#C9792A' },
  '简约': { bg: '#EEF9F1', text: '#31B46C' },
  '裸色系': { bg: '#FFF8E6', text: '#C9860A' },
};

function getTagColor(tag) {
  return TAG_COLORS[tag] || { bg: '#F2F0F3', text: '#6D6570' };
}

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.filter(Boolean);
      } catch (e) { /* fall through */ }
    }
    return s.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

function isPhoneLikeName(name) {
  return /^1\d{10}$/.test(String(name || '').trim());
}

function formatMoney(value) {
  if (!value && value !== 0) return '¥0';
  return '¥' + Math.round(value);
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return '今天';
  if (diff < 172800000) return '昨天';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return m + '月' + day + '日';
}

function decorateCustomer(c) {
  const tags = parseTags(c.tags);
  const phoneLike = isPhoneLikeName(c.name);
  const displayName = phoneLike ? '未设置名称' : (c.name || '未设置名称');
  const initial = phoneLike ? '客' : ((c.name && c.name[0]) || '客');
  const tagsWithColor = tags.map(t => ({ name: t, ...getTagColor(t) }));

  return {
    ...c,
    _tags: tagsWithColor,
    _displayName: displayName,
    _initial: initial,
    _totalSpentText: formatMoney(c.totalSpent),
    _recentServiceText: formatDateLabel(c.recentServiceAt)
  };
}

Page({
  data: {
    tabs: TABS,
    activeTab: '全部',
    keyword: '',
    customers: [],
    visibleCustomers: [],
    loading: true,
    loadFailed: false,
    tagPopoverId: null,
    showEditName: false,
    editingCustomerId: null,
    editingName: ''
  },

  onLoad() {
    this.loadCustomers();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadCustomers();
    }
  },

  onPullDownRefresh() {
    this.loadCustomers().finally(() => wx.stopPullDownRefresh());
  },

  async loadCustomers() {
    this.setData({ loading: true, loadFailed: false });
    const params = {};
    if (this.data.keyword) params.search = this.data.keyword;

    try {
      const res = await api.technician.customers.list(params);
      const rawList = Array.isArray(res) ? res : (res.data || res.list || []);
      const customers = rawList.map(decorateCustomer);
      const dynamicTags = customers.reduce((all, customer) => {
        customer._tags.forEach(tag => { if (all.indexOf(tag.name) < 0) all.push(tag.name); });
        return all;
      }, []);
      const tabs = ['全部'].concat(dynamicTags);
      const activeTab = tabs.indexOf(this.data.activeTab) >= 0 ? this.data.activeTab : '全部';
      this.setData({ customers, tabs, activeTab, loading: false });
      this.filterCustomers();
    } catch (err) {
      this.setData({ loading: false, loadFailed: true });
    }
  },

  filterCustomers() {
    const { customers, activeTab } = this.data;
    let visibleCustomers;
    if (activeTab === '全部') {
      visibleCustomers = customers;
    } else {
      visibleCustomers = customers.filter(c => c._tags.some(tag => tag.name === activeTab));
    }
    this.setData({ visibleCustomers });
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    this.filterCustomers();
  },

  onKeywordInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.loadCustomers();
    }, 400);
  },

  onSearchConfirm() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this.loadCustomers();
  },

  clearKeyword() {
    this.setData({ keyword: '' });
    this.loadCustomers();
  },

  resetFilters() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this.setData({ keyword: '', activeTab: '全部' });
    this.loadCustomers();
  },

  onUnload() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
  },

  viewCustomer(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/customer-detail/index?id=${id}` });
  },

  toggleTagPopover(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ tagPopoverId: this.data.tagPopoverId === id ? null : id });
  },

  startEditName(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      showEditName: true,
      editingCustomerId: id,
      editingName: isPhoneLikeName(name) ? '' : (name || '')
    });
  },

  cancelEditName() {
    this.setData({ showEditName: false, editingCustomerId: null, editingName: '' });
  },

  onEditNameInput(e) {
    this.setData({ editingName: e.detail.value });
  },

  async saveEditName() {
    const { editingCustomerId, editingName } = this.data;
    if (!editingName.trim()) {
      wx.showToast({ title: '名称不能为空', icon: 'none' });
      return;
    }
    try {
      await api.technician.customers.updateName(editingCustomerId, editingName.trim());
      wx.showToast({ title: '已更新', icon: 'success' });
      this.setData({ showEditName: false, editingCustomerId: null, editingName: '' });
      this.loadCustomers();
    } catch (err) {
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  async handleInvite() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const inviteCode = userInfo.invitationCode;
    if (!inviteCode) {
      wx.showToast({ title: '暂无邀请码', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: inviteCode,
      success() {
        wx.showToast({ title: '邀请码已复制', icon: 'success' });
      }
    });
  },

  noop() {}
});
