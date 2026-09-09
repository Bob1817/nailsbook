const uiColors = require('../../../utils/colors');
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
  dormant: '沉睡',
  deleted: '已注销',
  unbound: '已解绑'
};

const TAG_COLORS = {
  '常客': { bg: uiColors.page, text: uiColors.action },
  '新客': { bg: uiColors.page, text: uiColors.action },
  '高频': { bg: uiColors.page, text: uiColors.action },
  '简约': { bg: uiColors.page, text: uiColors.action },
  '裸色系': { bg: uiColors.page, text: uiColors.action },
};

function getTagColor(tag) {
  return TAG_COLORS[tag] || { bg: uiColors.page, text: uiColors.secondary };
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

function formatDateLabel(dateStr, now = new Date()) {
  if (!dateStr) return '';
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return '';
  if (dateOnly && (d.getFullYear() !== Number(dateOnly[1]) || d.getMonth() + 1 !== Number(dateOnly[2]) || d.getDate() !== Number(dateOnly[3]))) return '';
  const calendarDay = value => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const days = (calendarDay(now) - calendarDay(d)) / 86400000;
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days === -1) return '明天';
  if (days > 1 && days < 7) return days + '天前';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear() === now.getFullYear() ? '' : d.getFullYear() + '年';
  return year + m + '月' + day + '日';
}

function decorateCustomer(c) {
  const accountDeleted = c.account && c.account.status === 'deleted';
  const lifecycleStatus = accountDeleted ? 'deleted'
    : c.bindingStatus === 'inactive' ? 'unbound'
    : (c.lifecycle && c.lifecycle.status) || 'new';
  const terminal = lifecycleStatus === 'deleted' || lifecycleStatus === 'unbound';
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
    _lifecycleLabel: LIFECYCLE_LABELS[lifecycleStatus] || '新客',
    _lifecycleClass: `lifecycle-${lifecycleStatus}`,
    _lifecycleStatus: lifecycleStatus,
    _lifecycleReason: terminal ? (accountDeleted ? '客户账号已注销，保留历史服务记录' : '客户已解除绑定，保留历史服务记录') : (c.lifecycle && c.lifecycle.reason) || '尚未完成首次服务',
    _expectedServiceText: !terminal && c.lifecycle && c.lifecycle.expectedNextServiceAt
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
    const requestId = this._customerRequestId = (this._customerRequestId || 0) + 1;
    this.setData({ loading: true, loadFailed: false });
    const params = {};
    if (this.data.keyword) params.search = this.data.keyword;

    try {
      const [res, conversations] = await Promise.all([
        api.technician.customers.list(params),
        api.chat.technician.conversations({ timeout: 10000, silent: true }).catch(() => [])
      ]);
      if (requestId !== this._customerRequestId) return;
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
      if (requestId !== this._customerRequestId) return;
      this.setData({ loading: false, loadFailed: true });
    }
  },

  filterCustomers() {
    const { customers, activeTab, activeLifecycle } = this.data;
    let visibleCustomers = customers;
    if (activeLifecycle !== 'all') {
      visibleCustomers = visibleCustomers.filter(
        c => c._lifecycleStatus === activeLifecycle
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
    this._customerRequestId = (this._customerRequestId || 0) + 1;
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
    if (this._searchTimer) clearTimeout(this._searchTimer);
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
    this._customerRequestId = (this._customerRequestId || 0) + 1;
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
