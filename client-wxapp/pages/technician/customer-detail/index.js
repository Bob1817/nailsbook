const api = require('../../../services/api');
const { formatMoney, formatBookingDate, formatClock, parseDate } = require('../../../utils/format');

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
const PROFILE_FACT_CATEGORIES = [
  { value: 'allergy', label: '过敏' },
  { value: 'contraindication', label: '禁忌' },
  { value: 'preference', label: '稳定偏好' },
  { value: 'communication', label: '沟通习惯' },
  { value: 'reminder', label: '特别提醒' }
];
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
    archiving: false
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
      const relatedWorks = (raw.relatedWorks || []).map(work => ({
        ...work,
        _dateText: work.serviceDate ? formatBookingDate(work.serviceDate) : '',
        _permissionText: [
          work.permissions && work.permissions.canShare ? '分享' : '',
          work.permissions && work.permissions.canFavorite ? '收藏' : '',
          work.permissions && work.permissions.canComment ? '评论' : ''
        ].filter(Boolean).join(' · ') || '仅查看'
      }));
      const serviceRecords = (raw.serviceRecords || []).map(item => {
        const order = item.order || orders.find(candidate => String(candidate.id) === String(item.orderId)) || null;
        const stageCount = { before: 0, during: 0, after: 0 };
        (item.photos || []).forEach(photo => {
          if (stageCount[photo.stage] !== undefined) stageCount[photo.stage] += 1;
        });
        const missingPhotos = [
          stageCount.before ? '' : '服务前照片',
          stageCount.after ? '' : '完成后照片'
        ].filter(Boolean);
        const serviceTime = item.actualEndTime || item.actualStartTime || (order && order.startTime);
        return {
          ...item,
          _dateText: serviceTime
            ? `${formatBookingDate(serviceTime)} ${formatClock(serviceTime)}`
            : '记录草稿',
          _photoCount: (item.photos || []).length,
          _photoCountsText: `服务前 ${stageCount.before} · 过程中 ${stageCount.during} · 完成后 ${stageCount.after} 张`,
          _missingText: missingPhotos.length ? `缺${missingPhotos.join('、')}` : '',
          _statusText: item.status === 'complete' ? '已完善' : '待补全',
          _serviceTitle: order
            ? (order.customTitle
              || (order.service && order.service.name)
              || (order.sourceWork && order.sourceWork.title)
              || '预约服务')
            : '美甲服务'
        };
      });

      const customer = {
        ...raw,
        orders,
        relatedWorks,
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
        _profileGroups: (() => {
          const facts = (raw.profileFacts || []).map(item => ({
            ...item,
            _key: `f${item.id}`,
            _confirmedText: item.lastConfirmedAt ? formatBookingDate(item.lastConfirmedAt) : ''
          }));
          const activeFacts = facts.filter(item => item.status !== 'pending');
          const groupOf = categories => activeFacts.filter(item => categories.includes(item.category));
          const preferenceItems = [
            raw.preferredStyles ? `款式：${raw.preferredStyles}` : '',
            raw.preferredColors ? `颜色：${raw.preferredColors}` : '',
            raw.preferredNailShapes ? `甲型：${raw.preferredNailShapes}` : '',
            raw.preferredNailLengths ? `长度：${raw.preferredNailLengths}` : ''
          ].filter(Boolean).map((content, index) => ({ id: null, content, _key: `p${index}`, _confirmedText: '' }));
          return [
            { key: 'safety', title: '安全信息', items: groupOf(['allergy', 'contraindication']) },
            { key: 'preference', title: '稳定偏好', items: [...groupOf(['preference']), ...preferenceItems] },
            { key: 'habit', title: '服务习惯', items: groupOf(['communication']) },
            { key: 'personal', title: '个性需求', items: groupOf(['reminder']) }
          ].filter(group => group.items.length);
        })(),
        _pendingFacts: (raw.profileFacts || []).filter(item => item.status === 'pending').map(item => ({
          ...item,
          _key: `f${item.id}`,
          _categoryText: ({ allergy: '过敏', contraindication: '禁忌', preference: '稳定偏好', communication: '沟通习惯', reminder: '特别提醒' })[item.category] || '客户信息'
        })),
        _selfReported: [
          raw.allergies ? { category: 'allergy', label: '过敏', content: raw.allergies } : null,
          raw.contraindications ? { category: 'contraindication', label: '禁忌', content: raw.contraindications } : null,
          raw.specialReminders ? { category: 'reminder', label: '提醒', content: raw.specialReminders } : null
        ].filter(Boolean),
        _serviceRecords: serviceRecords,
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
    const { orderId, mode } = e.currentTarget.dataset;
    if (orderId) wx.navigateTo({ url: `/pages/technician/complete-service/index?id=${orderId}&mode=${mode || 'record'}` });
  },

  onAvatarError() {
    this.setData({ 'customer._avatarFailed': true });
  },

  // ---------- 美甲档案待确认信息 ----------
  async updateFactStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    if (!id || !status || this._updatingFact) return;
    this._updatingFact = true;
    try {
      await api.technician.customers.updateProfileFact(this.customerId, id, status);
      wx.showToast({ title: status === 'active' ? '已确认' : '已忽略', icon: 'none' });
      await this.loadCustomer();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this._updatingFact = false;
    }
  },

  async confirmSelfReported(e) {
    const { category, content } = e.currentTarget.dataset;
    if (!category || !content || this._updatingFact) return;
    this._updatingFact = true;
    try {
      await api.technician.customers.createProfileFact(this.customerId, { category, content });
      wx.showToast({ title: '已写入客户档案', icon: 'none' });
      await this.loadCustomer();
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this._updatingFact = false;
    }
  },

  addProfileFact() {
    if (this._updatingFact) return;
    wx.showActionSheet({
      itemList: PROFILE_FACT_CATEGORIES.map(item => item.label),
      success: ({ tapIndex }) => {
        const category = PROFILE_FACT_CATEGORIES[tapIndex];
        if (!category) return;
        wx.showModal({
          title: `新增${category.label}`,
          editable: true,
          placeholderText: '填写下次服务仍然需要使用的信息',
          confirmText: '保存',
          success: async (result) => {
            if (!result.confirm) return;
            const content = String(result.content || '').trim();
            if (!content) return wx.showToast({ title: '请填写档案内容', icon: 'none' });
            if (content.length > 500) return wx.showToast({ title: '档案内容不能超过 500 字', icon: 'none' });
            this._updatingFact = true;
            try {
              await api.technician.customers.createProfileFact(this.customerId, {
                category: category.value,
                content
              });
              wx.showToast({ title: '已写入客户档案', icon: 'none' });
              await this.loadCustomer();
            } catch (err) {
              wx.showToast({ title: err.message || '档案保存失败', icon: 'none' });
            } finally {
              this._updatingFact = false;
            }
          }
        });
      }
    });
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
