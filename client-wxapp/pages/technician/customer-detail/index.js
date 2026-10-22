const api = require('../../../services/api');
const { formatMoney, formatBookingDate, parseDate } = require('../../../utils/format');

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

function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function orderLabel(order) {
  const name = order.customTitle
    || (order.service && order.service.name)
    || (order.sourceWork && order.sourceWork.title)
    || '预约服务';
  return `${name} · ${formatBookingDate(order.startTime)}`;
}

function emptyFuDraft() {
  return {
    content: '',
    plannedDate: todayDateValue(),
    beforePhoto: '',
    afterPhoto: '',
    nailProjects: '',
    materials: '',
    tools: ''
  };
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
    showNotesEdit: false,
    notesDraft: '',
    savingNotes: false,
    archiving: false,
    savingFollowUp: false,
    completingFollowUpId: '',
    showFollowUpSheet: false,
    fuDraft: emptyFuDraft(),
    fuBookingOptions: [],
    fuWorkOptions: [],
    fuBookingIndex: 0,
    fuWorkIndex: 0,
    uploadingFu: false
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

      const orders = raw.orders || [];

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
        _profileFacts: (raw.profileFacts || []).map(item => ({
          ...item,
          _categoryText: ({ allergy: '过敏', contraindication: '禁忌', preference: '稳定偏好', communication: '沟通习惯', reminder: '特别提醒' })[item.category] || '客户信息',
          _confirmedText: item.lastConfirmedAt ? formatBookingDate(item.lastConfirmedAt) : ''
        })),
        _serviceRecords: (raw.serviceRecords || []).map(item => ({
          ...item,
          _dateText: item.actualEndTime ? formatBookingDate(item.actualEndTime) : '记录草稿',
          _photoCount: (item.photos || []).length
        })),
        _followUps: (raw.followUps || []).map(item => {
          const relatedWork = item.relatedWork || null;
          return {
            ...item,
            _plannedText: formatBookingDate(item.plannedAt),
            _statusText: item.status === 'completed' ? '已完成' : '待跟进',
            _beforePhotos: parseJsonArray(item.beforePhotos),
            _afterPhotos: parseJsonArray(item.afterPhotos),
            _relatedOrderText: item.relatedOrder ? orderLabel(item.relatedOrder) : '',
            _relatedWork: relatedWork
              ? { id: relatedWork.id, title: relatedWork.title || '' }
              : null
          };
        }),
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
  openServiceRecord(e) {
    const orderId = e.currentTarget.dataset.orderId;
    if (orderId) wx.navigateTo({ url: `/pages/technician/complete-service/index?id=${orderId}&mode=record` });
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

  openNotesEdit() {
    if (this.data.savingNotes) return;
    this.setData({
      showNotesEdit: true,
      notesDraft: this.data.customer.notes || ''
    });
  },

  closeNotesEdit() {
    if (this.data.savingNotes) return;
    this.setData({ showNotesEdit: false, notesDraft: '' });
  },

  onNotesInput(e) {
    if (this.data.savingNotes) return;
    this.setData({ notesDraft: e.detail.value });
  },

  async saveNotes() {
    if (this.data.savingNotes) return;
    const notes = String(this.data.notesDraft || '').trim();
    this.setData({ savingNotes: true });
    try {
      await api.technician.customers.updateNotes(this.customerId, notes);
      this.setData({ showNotesEdit: false, notesDraft: '', savingNotes: false });
      wx.showToast({ title: '备注已更新', icon: 'success' });
      await this.loadCustomer();
    } catch (err) {
      this.setData({ savingNotes: false });
      wx.showToast({ title: err.message || '备注更新失败', icon: 'none' });
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
      url: `/pages/technician/create-order/index?customerId=${customer.id}`
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

  openFollowUpSheet() {
    const customer = this.data.customer;
    if (!customer) return;
    this.setData({
      showFollowUpSheet: true,
      fuBookingOptions: [{ id: 0, label: '不关联预约' }].concat(
        (customer.orders || []).map((order) => ({ id: order.id, label: orderLabel(order) }))
      ),
      fuWorkOptions: [{ id: 0, label: '不关联作品' }].concat(
        (customer.relatedWorks || []).map((work) => ({ id: work.id, label: work.title || '未命名作品' }))
      ),
      fuBookingIndex: 0,
      fuWorkIndex: 0,
      fuDraft: emptyFuDraft()
    });
  },

  closeFollowUpSheet() {
    if (this.data.savingFollowUp || this.data.uploadingFu) return;
    this.setData({ showFollowUpSheet: false });
  },

  onFuContentInput(e) {
    this.setData({ 'fuDraft.content': e.detail.value });
  },

  onFuDateChange(e) {
    this.setData({ 'fuDraft.plannedDate': e.detail.value });
  },

  onFuBookingChange(e) {
    this.setData({ fuBookingIndex: Number(e.detail.value) || 0 });
  },

  onFuWorkChange(e) {
    this.setData({ fuWorkIndex: Number(e.detail.value) || 0 });
  },

  onFuFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    if (field) this.setData({ [`fuDraft.${field}`]: e.detail.value });
  },

  chooseFuPhoto(e) {
    const side = e.currentTarget.dataset.side;
    if (!side || this.data.uploadingFu) return;
    const onChooseFail = (err) => {
      if (!String(err && err.errMsg || '').includes('cancel')) {
        wx.showToast({ title: '无法打开图片选择器', icon: 'none' });
      }
    };
    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: (res) => this.uploadFuPhoto(side, res.tempFiles && res.tempFiles[0]),
        fail: onChooseFail
      });
      return;
    }
    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => this.uploadFuPhoto(side, { tempFilePath: (res.tempFilePaths || [])[0] }),
      fail: onChooseFail
    });
  },

  async uploadFuPhoto(side, file) {
    const filePath = file && (file.tempFilePath || file.path);
    if (!filePath) {
      wx.showToast({ title: '未能读取所选图片', icon: 'none' });
      return;
    }
    this.setData({ uploadingFu: true });
    wx.showLoading({ title: '上传中...' });
    try {
      const result = await api.upload.image(filePath, 'technician');
      this.setData({ [`fuDraft.${side}Photo`]: result.url });
    } catch (err) {
      wx.showToast({ title: err.message || '照片上传失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ uploadingFu: false });
    }
  },

  removeFuPhoto(e) {
    const side = e.currentTarget.dataset.side;
    if (!side || this.data.uploadingFu) return;
    this.setData({ [`fuDraft.${side}Photo`]: '' });
  },

  previewFollowUpPhoto(e) {
    const urls = e.currentTarget.dataset.urls || [];
    if (!urls.length) return;
    const current = e.currentTarget.dataset.url;
    wx.previewImage({ urls, current: current || urls[0] });
  },

  async submitFollowUp() {
    if (this.data.savingFollowUp || this.data.uploadingFu) return;
    const draft = this.data.fuDraft || {};
    const content = (draft.content || '').trim();
    if (!content) {
      wx.showToast({ title: '请输入跟进内容', icon: 'none' });
      return;
    }
    const payload = {
      content,
      plannedAt: `${draft.plannedDate || todayDateValue()}T09:00:00+08:00`
    };
    if (this.data.fuBookingIndex > 0) {
      const orders = (this.data.customer && this.data.customer.orders) || [];
      const order = orders[this.data.fuBookingIndex - 1];
      if (order) payload.relatedOrderId = order.id;
    }
    if (this.data.fuWorkIndex > 0) {
      const works = (this.data.customer && this.data.customer.relatedWorks) || [];
      const work = works[this.data.fuWorkIndex - 1];
      if (work) payload.relatedWorkId = work.id;
    }
    if (draft.beforePhoto) payload.beforePhotos = [draft.beforePhoto];
    if (draft.afterPhoto) payload.afterPhotos = [draft.afterPhoto];
    const nailProjects = (draft.nailProjects || '').trim();
    const materials = (draft.materials || '').trim();
    const tools = (draft.tools || '').trim();
    if (nailProjects) payload.nailProjects = nailProjects;
    if (materials) payload.materials = materials;
    if (tools) payload.tools = tools;
    this.setData({ savingFollowUp: true });
    try {
      await api.technician.customers.createFollowUp(this.customerId, payload);
      wx.showToast({ title: '跟进记录已保存', icon: 'success' });
      this.setData({ showFollowUpSheet: false });
      await this.loadCustomer();
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
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
