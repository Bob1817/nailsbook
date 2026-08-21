const api = require('../../../services/api');

const LIFECYCLE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'new', label: '新客' },
  { key: 'active', label: '活跃' },
  { key: 'due', label: '待复购' },
  { key: 'dormant', label: '沉睡' }
];

const LIFECYCLE_LABELS = {
  new: '新客',
  active: '活跃',
  due: '待复购',
  dormant: '沉睡'
};

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

function conversationClients(response) {
  const conversations = Array.isArray(response)
    ? response
    : ((response && (response.list || response.data)) || []);
  return conversations.reduce((map, conversation) => {
    const client = conversation.client || {};
    if (client.id != null) map[String(client.id)] = client;
    return map;
  }, {});
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
  const accountName = isPhoneLikeName(c.accountName) ? '' : String(c.accountName || '').trim();
  const savedName = isPhoneLikeName(c.name) ? '' : String(c.name || '').trim();
  const hasRemark = Boolean(savedName && accountName && savedName !== accountName);
  const displayName = hasRemark
    ? `${savedName}（${accountName}）`
    : (accountName || savedName || '未设置名称');
  const initialName = accountName || savedName;
  const initial = initialName ? initialName[0] : '客';
  const tagsWithColor = tags.map(t => ({ name: t, ...getTagColor(t) }));

  return {
    ...c,
    _tags: tagsWithColor,
    _displayName: displayName,
    _hasRemark: hasRemark,
    _initial: initial,
    _totalSpentText: formatMoney(c.totalSpent),
    _recentServiceText: formatDateLabel(c.recentServiceAt),
    _lifecycleLabel: LIFECYCLE_LABELS[c.lifecycle && c.lifecycle.status] || '新客',
    _lifecycleClass: `lifecycle-${(c.lifecycle && c.lifecycle.status) || 'new'}`,
    _lifecycleReason: (c.lifecycle && c.lifecycle.reason) || '尚未完成首次服务',
    _expectedServiceText: c.lifecycle && c.lifecycle.expectedNextServiceAt
      ? formatDateLabel(c.lifecycle.expectedNextServiceAt)
      : ''
  };
}

Page({
  data: {
    lifecycleTabs: LIFECYCLE_TABS,
    activeLifecycle: 'all',
    tabs: ['全部'],
    activeTab: '全部',
    keyword: '',
    customers: [],
    visibleCustomers: [],
    loading: true,
    loadFailed: false
  },

  onLoad(options) {
    const lifecycle = options && options.lifecycle;
    if (LIFECYCLE_TABS.some(item => item.key === lifecycle)) {
      this.setData({ activeLifecycle: lifecycle });
    }
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
      const [res, conversations] = await Promise.all([
        api.technician.customers.list(params),
        api.chat.technician.conversations({ timeout: 10000, silent: true }).catch(() => [])
      ]);
      const clientsById = conversationClients(conversations);
      const rawList = Array.isArray(res) ? res : (res.data || res.list || []);
      const customers = rawList.map((customer) => {
        const conversationClient = clientsById[String(customer.clientUserId)] || {};
        return decorateCustomer({
          ...customer,
          accountName: customer.accountName || conversationClient.nickname || '',
          avatarUrl: customer.avatarUrl || conversationClient.avatarUrl || ''
        });
      });
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
    const { customers, activeTab, activeLifecycle } = this.data;
    let visibleCustomers = customers;
    if (activeLifecycle !== 'all') {
      visibleCustomers = visibleCustomers.filter(
        c => c.lifecycle && c.lifecycle.status === activeLifecycle
      );
    }
    if (activeTab !== '全部') {
      visibleCustomers = visibleCustomers.filter(
        c => c._tags.some(tag => tag.name === activeTab)
      );
    }
    this.setData({ visibleCustomers });
  },

  onLifecycleChange(e) {
    const lifecycle = e.currentTarget.dataset.lifecycle;
    if (lifecycle === this.data.activeLifecycle) return;
    this.setData({ activeLifecycle: lifecycle });
    this.filterCustomers();
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
    this.setData({ keyword: '', activeTab: '全部', activeLifecycle: 'all' });
    this.loadCustomers();
  },

  onUnload() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
  },

  viewCustomer(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/customer-detail/index?id=${id}` });
  },

  onAvatarError(e) {
    const id = e.currentTarget.dataset.id;
    const markFailed = customer => String(customer.id) === String(id)
      ? { ...customer, _avatarFailed: true }
      : customer;
    this.setData({
      customers: this.data.customers.map(markFailed),
      visibleCustomers: this.data.visibleCustomers.map(markFailed)
    });
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
  }
});
