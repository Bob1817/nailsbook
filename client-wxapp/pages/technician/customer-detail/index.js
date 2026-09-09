const api = require('../../../services/api');
const { formatMoney, formatBookingDate, formatClock, parseDate } = require('../../../utils/format');
const { normalizeOrder, resolveOrderPresentation, getStatusLabel, getStatusTone } = require('../../../utils/order');

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
    archiving: false,
    followUpContent: '',
    followUpDate: todayDateValue(),
    savingFollowUp: false,
    completingFollowUpId: ''
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
    if (!this.customerId) return;
    const requestId = this._detailRequestId = (this._detailRequestId || 0) + 1;
    this.setData({ loading: true, loadFailed: false, loadErrorText: '' });
    try {
      const [detail, conversations] = await Promise.all([
        api.technician.customers.detail(this.customerId),
        api.chat.technician.conversations({ timeout: 10000, silent: true }).catch(() => [])
      ]);
      if (requestId !== this._detailRequestId) return;
      const conversationClient = findConversationClient(conversations, detail.clientUserId) || {};
      const raw = {
        ...detail,
        accountName: detail.accountName || conversationClient.nickname || '',
        avatarUrl: detail.avatarUrl || conversationClient.avatarUrl || ''
      };

      const orders = (raw.orders || []).map((item) => {
        const order = normalizeOrder({ ...item, customer: { id: raw.id, name: buildCustomerIdentity(raw).displayName || raw.name, phone: raw.phone, clientUserId: raw.clientUserId } });
        const presentation = resolveOrderPresentation(order);
        return {
          ...order,
          _clock: formatClock(order.startTime),
          _typeLabel: presentation.typeLabel,
          _fullAddress: presentation.fullAddress,
          _statusLabel: getStatusLabel(order.status),
          _statusTone: getStatusTone(order.status),
          _priceText: Number(order.price) > 0 ? formatMoney(order.price) : ''
        };
      });

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
      if (requestId !== this._detailRequestId) return;
      this.setData({ loading: false, loadFailed: true, loadErrorText: '客户资料暂时无法加载' });
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
    if (this.data.savingRemark) return;
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
    if (this.data.savingRemark) return;
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

  onBookingCardOpen(e) {
    const id = e.detail && e.detail.id;
    if (id) wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${id}` });
  },

  onBookingCardContact(e) {
    const phone = e.detail && e.detail.phone;
    if (!phone) return wx.showToast({ title: '客户暂无电话', icon: 'none' });
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  onBookingCardMessage(e) {
    const clientId = e.detail && e.detail.clientId;
    if (!clientId) return wx.showToast({ title: '客户尚未关联小程序账号，请拨打电话', icon: 'none' });
    wx.navigateTo({ url: `/pages/technician/chat-detail/index?clientId=${clientId}` });
  },

  onBookingCardNavigate(e) {
    const order = (this.data.customer.orders || []).find(item => item.id === e.detail.id);
    if (!order) return;
    if (order.latitude && order.longitude) {
      wx.openLocation({ latitude: Number(order.latitude), longitude: Number(order.longitude), name: order.shopName || '预约地点', address: order.address || '', scale: 16 });
    } else if (order.address) {
      wx.setClipboardData({ data: order.address });
    } else {
      wx.showToast({ title: '暂无地址', icon: 'none' });
    }
  },

  goWorkDetail(e) {
    wx.navigateTo({ url: `/pages/technician/work-detail/index?id=${e.currentTarget.dataset.id}` });
  },

  createExclusiveWork() {
    wx.navigateTo({ url: `/pages/technician/work-edit/index?customerId=${this.customerId}` });
  },

  newOrder() {
    const customer = this.data.customer;
    if (!customer || !customer.clientUserId) {
      wx.showToast({ title: '客户尚未关联小程序账号，请拨打电话', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/technician/chat-detail/index?clientId=${customer.clientUserId}&clientName=${encodeURIComponent(customer._displayName || customer.name || '客户')}`
    });
  },

  archiveCustomer() {
    if (this.data.archiving) return;
    this.setData({ archiving: true });
    wx.showModal({
      title: '归档客户',
      content: '归档后客户资料和历史记录仍会保留；客户再次预约时会自动恢复。',
      confirmText: '确认归档',
      success: async (result) => {
        if (!result.confirm) {
          this.setData({ archiving: false });
          return;
        }
        try {
          await api.technician.customers.archive(this.customerId);
          wx.showToast({ title: '客户已归档', icon: 'success' });
          this._archiveTimer = setTimeout(() => wx.navigateBack({
            fail: () => this.setData({ archiving: false })
          }), 600);
        } catch (err) {
          this.setData({ archiving: false });
          wx.showToast({ title: err.message || '归档失败', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ archiving: false });
      }
    });
  },

  onUnload() {
    this._detailRequestId = (this._detailRequestId || 0) + 1;
    if (this._archiveTimer) clearTimeout(this._archiveTimer);
  },

  onFollowUpInput(e) {
    this.setData({ followUpContent: e.detail.value });
  },

  onFollowUpDateChange(e) {
    this.setData({ followUpDate: e.detail.value });
  },

  async createFollowUp() {
    const draft = this.data.followUpContent;
    const plannedDate = this.data.followUpDate;
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
        plannedAt: `${plannedDate}T09:00:00+08:00`
      });
      if (this.data.followUpContent === draft && this.data.followUpDate === plannedDate) {
        this.setData({ followUpContent: '' });
      }
      wx.showToast({ title: '跟进计划已创建', icon: 'success' });
      await this.loadCustomer();
    } catch (err) {
      wx.showToast({ title: err.message || '创建失败', icon: 'none' });
    } finally {
      this.setData({ savingFollowUp: false });
    }
  },

  async completeFollowUp(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || this.data.completingFollowUpId) return;
    this.setData({ completingFollowUpId: id });
    try {
      await api.technician.customers.completeFollowUp(this.customerId, id);
      wx.showToast({ title: '已完成跟进', icon: 'success' });
      await this.loadCustomer();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ completingFollowUpId: '' });
    }
  },

  // ---------- 标签编辑 ----------
  openTagEdit() {
    if (this.data.savingTags) return;
    const editTags = [...this.data.customer._tags];
    this.setData({ showTagEdit: true, editTags, newTag: '' });
    this._recalcAvailable(editTags);
  },
  closeTagEdit() {
    if (this.data.savingTags) return;
    this.setData({ showTagEdit: false });
  },

  _recalcAvailable(editTags) {
    const available = this.data.allTags.filter((t) => editTags.indexOf(t) < 0);
    this.setData({ availableTags: available });
  },

  removeTag(e) {
    if (this.data.savingTags) return;
    const tag = e.currentTarget.dataset.tag;
    const editTags = this.data.editTags.filter((t) => t !== tag);
    this.setData({ editTags });
    this._recalcAvailable(editTags);
  },

  addExistingTag(e) {
    if (this.data.savingTags) return;
    const tag = e.currentTarget.dataset.tag;
    if (this.data.editTags.indexOf(tag) >= 0) return;
    const editTags = [...this.data.editTags, tag];
    this.setData({ editTags });
    this._recalcAvailable(editTags);
  },

  onNewTagInput(e) {
    if (this.data.savingTags) return;
    this.setData({ newTag: e.detail.value });
  },

  addNewTag() {
    if (this.data.savingTags) return;
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
    const submittedTags = [...this.data.editTags];
    this.setData({ savingTags: true });
    // 后端 tags 字段是 String，传逗号分隔字符串
    const tagString = submittedTags.join(',');
    try {
      await Promise.all(submittedTags.map((name) =>
        api.technician.tagTemplates.create({ name, type: 'customer' }).catch((err) => {
          if (String(err && err.message || '').includes('已存在')) return;
          throw err;
        })
      ));
      await api.technician.customers.updateTags(this.customerId, tagString);
      this.setData({
        savingTags: false,
        showTagEdit: false,
        'customer._tags': submittedTags,
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
