const api = require('../../../services/api');
const { formatMoney, formatBookingDate, parseDate } = require('../../../utils/format');
const { getStatusLabel, getStatusTone } = require('../../../utils/order');

const LIFECYCLE_LABELS = {
  new: '新客',
  active: '活跃',
  due: '待复购',
  dormant: '沉睡'
};
const SOURCE_LABELS = {
  historical: '历史客户',
  invite: '邀请码注册',
  binding: '绑定申请',
  booking: '首次预约',
  custom_request: '私人设计需求'
};

function todayDateValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

function buildCustomerIdentity(raw) {
  const accountName = isPhoneLikeName(raw.accountName) ? '' : String(raw.accountName || '').trim();
  const savedName = isPhoneLikeName(raw.name) ? '' : String(raw.name || '').trim();
  const hasRemark = Boolean(savedName && accountName && savedName !== accountName);
  return {
    accountName,
    savedName,
    hasRemark,
    displayName: hasRemark
      ? `${savedName}（${accountName}）`
      : (accountName || savedName || '未设置名称')
  };
}

function findConversationClient(response, clientUserId) {
  const conversations = Array.isArray(response)
    ? response
    : ((response && (response.list || response.data)) || []);
  const targetId = String(clientUserId || '');
  for (let i = 0; i < conversations.length; i += 1) {
    const client = conversations[i].client || {};
    if (String(client.id || '') === targetId) return client;
  }
  return null;
}

Page({
  data: {
    customer: null,
    customerId: '',
    loading: true,
    loadFailed: false,
    loadErrorText: '',

    allTags: [],          // 该技师所有 distinct 标签

    // 标签编辑弹层
    showTagEdit: false,
    editTags: [],
    availableTags: [],
    newTag: '',
    savingTags: false,
    showRemarkEdit: false,
    remarkDraft: '',
    savingRemark: false,
    followUpContent: '',
    followUpDate: todayDateValue(),
    savingFollowUp: false
  },

  onLoad(options) {
    this.customerId = options.id;
    this.setData({ customerId: this.customerId || '' });
    this.loadAllTags();
    if (this.customerId) this.loadCustomer();
    else this.setData({ loading: false, loadFailed: true, loadErrorText: '客户参数无效' });
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
    if (this._loadingCustomer || !this.customerId) return;
    this._loadingCustomer = true;
    this.setData({ loading: true, loadFailed: false, loadErrorText: '' });
    try {
      const [detail, conversations] = await Promise.all([
        api.technician.customers.detail(this.customerId),
        api.chat.technician.conversations({ timeout: 10000, silent: true }).catch(() => [])
      ]);
      const conversationClient = findConversationClient(conversations, detail.clientUserId) || {};
      const raw = {
        ...detail,
        accountName: detail.accountName || conversationClient.nickname || '',
        avatarUrl: detail.avatarUrl || conversationClient.avatarUrl || ''
      };

      const orders = (raw.orders || []).map((o) => ({
        ...o,
        _statusLabel: getStatusLabel(o.status),
        _statusTone: getStatusTone(o.status),
        _dateStr: formatBookingDate(o.startTime || o.createdAt),
        _priceText: o.quotePrice ? formatMoney(o.quotePrice) : '待报价',
        _serviceTypeLabel: o.serviceType === 'shop' ? '到店' : '上门',
        _serviceTypeClass: o.serviceType === 'shop' ? 'type-shop' : 'type-home',
        _serviceName: o.customTitle
          || (o.customServiceRequest && o.customServiceRequest.title)
          || (o.designRequest && o.designRequest.title)
          || '预约服务'
      }));

      const revenues = raw.revenues || [];
      const summary = raw.businessSummary || {};
      const totalSpent = Number(summary.confirmedSpend)
        || revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);

      // 最近服务：orders 已按 startTime desc 排序
      const recent = orders.length ? (orders[0].startTime || orders[0].createdAt) : null;
      const recentDate = parseDate(recent);

      const tags = parseTags(raw.tags);
      const identity = buildCustomerIdentity(raw);

      const customer = {
        ...raw,
        orders,
        relatedWorks: (raw.relatedWorks || []).map(work => ({
          ...work,
          _dateText: work.serviceDate ? formatBookingDate(work.serviceDate) : '',
          _permissionText: [
            work.permissions && work.permissions.canShare ? '分享' : '',
            work.permissions && work.permissions.canFavorite ? '收藏' : '',
            work.permissions && work.permissions.canComment ? '评论' : ''
          ].filter(Boolean).join(' · ') || '仅查看'
        })),
        _tags: tags,
        _displayName: identity.displayName,
        _accountName: identity.accountName,
        _remarkName: identity.hasRemark ? identity.savedName : '',
        _initial: (identity.accountName || identity.savedName || '客')[0],
        _phoneMasked: maskPhone(raw.phone),
        _genderText: genderText(raw.gender),
        _birthdayText: raw.birthday ? String(raw.birthday).slice(0, 10) : '',
        _totalSpentText: totalSpent > 0 ? formatMoney(totalSpent) : '¥0',
        _totalOrders: orders.length,
        _completedServices: Number(summary.completedServiceCount) || 0,
        _averageTicketText: summary.averageTicket != null
          ? formatMoney(summary.averageTicket)
          : '暂无',
        _firstServiceText: summary.firstServiceAt
          ? formatBookingDate(summary.firstServiceAt)
          : '暂无',
        _lastServiceText: summary.lastServiceAt
          ? formatBookingDate(summary.lastServiceAt)
          : '暂无',
        _serviceCycleText: summary.serviceCycleDays
          ? `${summary.serviceCycleDays} 天`
          : '暂无',
        _serviceCycleHint: summary.serviceCycleSource === 'personal'
          ? '根据历史服务间隔计算'
          : `数据不足，采用 ${summary.defaultServiceCycleDays || 28} 天默认周期`,
        _expectedNextServiceText: summary.expectedNextServiceAt
          ? formatBookingDate(summary.expectedNextServiceAt)
          : '完成首次服务后生成',
        _lifecycleLabel: LIFECYCLE_LABELS[raw.lifecycle && raw.lifecycle.status] || '新客',
        _lifecycleReason: (raw.lifecycle && raw.lifecycle.reason) || '尚未完成首次服务',
        _sourceLabel: SOURCE_LABELS[raw.sourceType] || '其他来源',
        _followUps: (raw.followUps || []).map(item => ({
          ...item,
          _plannedText: formatBookingDate(item.plannedAt),
          _statusText: item.status === 'completed' ? '已完成' : '待跟进'
        })),
        _recentLabel: summary.lastServiceAt
          ? (() => {
              const date = parseDate(summary.lastServiceAt);
              return date ? `${date.getMonth() + 1}/${date.getDate()}` : '暂无';
            })()
          : recentDate
          ? `${recentDate.getMonth() + 1}/${recentDate.getDate()}`
          : '暂无'
      };

      this.setData({ customer, loading: false, loadFailed: false });
    } catch (err) {
      this.setData({ loading: false, loadFailed: true, loadErrorText: '客户资料暂时无法加载' });
    } finally {
      this._loadingCustomer = false;
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

  onAvatarError() {
    this.setData({ 'customer._avatarFailed': true });
  },

  openRemarkEdit() {
    this.setData({
      showRemarkEdit: true,
      remarkDraft: this.data.customer._remarkName || ''
    });
  },

  closeRemarkEdit() {
    if (this.data.savingRemark) return;
    this.setData({ showRemarkEdit: false, remarkDraft: '' });
  },

  onRemarkInput(e) {
    this.setData({ remarkDraft: e.detail.value });
  },

  async saveRemark() {
    if (this.data.savingRemark) return;
    const remark = String(this.data.remarkDraft || '').trim();
    if (!remark) {
      wx.showToast({ title: '请输入客户备注', icon: 'none' });
      return;
    }
    this.setData({ savingRemark: true });
    try {
      await api.technician.customers.updateName(this.customerId, remark);
      this.setData({ showRemarkEdit: false, remarkDraft: '', savingRemark: false });
      wx.showToast({ title: '备注已更新', icon: 'success' });
      await this.loadCustomer();
    } catch (err) {
      this.setData({ savingRemark: false });
      wx.showToast({ title: err.message || '备注更新失败', icon: 'none' });
    }
  },

  goOrderDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  goWorkDetail(e) {
    wx.navigateTo({ url: `/pages/technician/work-detail/index?id=${e.currentTarget.dataset.id}` });
  },

  createExclusiveWork() {
    wx.navigateTo({ url: `/pages/technician/work-edit/index?customerId=${this.customerId}` });
  },

  newOrder() {
    const customer = this.data.customer;
    wx.navigateTo({
      url: `/pages/technician/chat-detail/index?clientId=${this.customerId}&clientName=${encodeURIComponent(customer._displayName)}`
    });
  },

  archiveCustomer() {
    wx.showModal({
      title: '归档客户',
      content: '归档后客户资料和历史记录仍会保留；客户再次预约时会自动恢复。',
      confirmText: '确认归档',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await api.technician.customers.archive(this.customerId);
          wx.showToast({ title: '客户已归档', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 600);
        } catch (err) {
          wx.showToast({ title: err.message || '归档失败', icon: 'none' });
        }
      }
    });
  },

  onFollowUpInput(e) {
    this.setData({ followUpContent: e.detail.value });
  },

  onFollowUpDateChange(e) {
    this.setData({ followUpDate: e.detail.value });
  },

  async createFollowUp() {
    const content = (this.data.followUpContent || '').trim();
    if (!content) {
      wx.showToast({ title: '请输入跟进内容', icon: 'none' });
      return;
    }
    if (this.data.savingFollowUp) return;
    this.setData({ savingFollowUp: true });
    try {
      await api.technician.customers.createFollowUp(this.customerId, {
        content,
        plannedAt: `${this.data.followUpDate}T09:00:00+08:00`
      });
      this.setData({ followUpContent: '', savingFollowUp: false });
      wx.showToast({ title: '跟进计划已创建', icon: 'success' });
      this.loadCustomer();
    } catch (err) {
      this.setData({ savingFollowUp: false });
      wx.showToast({ title: err.message || '创建失败', icon: 'none' });
    }
  },

  async completeFollowUp(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    try {
      await api.technician.customers.completeFollowUp(this.customerId, id);
      wx.showToast({ title: '已完成跟进', icon: 'success' });
      this.loadCustomer();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
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
