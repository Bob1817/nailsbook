const api = require('../../../services/api');
const { formatBookingDate, formatClock } = require('../../../utils/format');

const ORDER_STATUS_LABELS = {
  pending: '待确认',
  pending_quote: '待报价',
  pending_client_confirm: '待客户确认',
  confirmed: '待到店',
  in_progress: '服务中',
  in_service: '服务中',
  completed: '已完成',
  cancelled: '已取消',
  rejected: '已拒绝',
  expired: '已过期',
  no_show: '未到店'
};

const REACTION_OPTIONS = [
  { value: 'normal', label: '正常' },
  { value: 'discomfort', label: '不适' },
  { value: 'pain', label: '疼痛' },
  { value: 'sensitive', label: '敏感' }
];

const NAIL_CONDITION_OPTIONS = ['甲面正常', '甲面偏薄', '甲面受损', '指缘敏感', '有翘起或空鼓', '建构加固', '游离线偏高'];
const PREFERENCE_OPTIONS = ['偏好薄透', '偏好短甲', '偏好自然色', '偏好显白色', '注重细节', '希望耐久', '喜欢透亮', '喜欢猫眼'];

const MISSING_LABELS = {
  beforePhoto: '服务前照片',
  afterPhoto: '完成后照片',
  nailCondition: '甲面情况',
  reactionLevel: '客户反应'
};

function local(d) {
  if (!Number.isFinite(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function photosByStage(record, stage) {
  return ((record && record.photos) || []).filter(item => item.stage === stage).map(item => item.url);
}
function clockText(date) {
  const p = n => String(n).padStart(2, '0');
  return `${p(date.getHours())}:${p(date.getMinutes())}`;
}
function uniqueText(values) {
  return values.filter((value, index, list) => value && list.indexOf(value) === index);
}
function alertsFromOrder(order) {
  const customer = (order && order.customer) || {};
  return uniqueText([
    customer.allergies ? `过敏：${customer.allergies}` : '',
    customer.contraindications ? `禁忌：${customer.contraindications}` : '',
    customer.specialReminders ? `提醒：${customer.specialReminders}` : '',
    ...((customer.profileFacts || [])
      .filter(fact => ['allergy', 'contraindication', 'reminder'].includes(fact.category))
      .map(fact => fact.status === 'pending' ? `${fact.content}（待确认）` : fact.content))
  ]);
}
function preparationsFromOrder(order) {
  const works = [];
  if (order && order.sourceWork) works.push(order.sourceWork);
  ((order && order.intentWorks) || []).forEach(item => {
    if (item && item.work) works.push(item.work);
  });
  return works
    .filter((work, index, values) => work && work.preparation && values.findIndex(item => item && item.id === work.id) === index)
    .map(work => ({ ...work.preparation, workId: work.id, title: work.title || '关联作品' }));
}
function suggestionsFromValues(values, limit) {
  const result = [];
  values.forEach(raw => {
    String(raw || '').split(/[、,，;；\n]+/).forEach(item => {
      const value = item.trim();
      if (value && !result.includes(value)) result.push(value);
    });
  });
  return result.slice(0, limit || 8);
}
function splitReusable(value) {
  return suggestionsFromValues([value], 30);
}
function buildWorkReview(record, preparation, durationMinutes) {
  const currentTools = splitReusable(record.tools);
  const standardTools = splitReusable(preparation && preparation.tools);
  const currentMaterials = splitReusable(record.materials);
  const standardMaterials = splitReusable(preparation && preparation.materials);
  const addedTools = currentTools.filter(item => !standardTools.includes(item));
  const addedMaterials = currentMaterials.filter(item => !standardMaterials.includes(item));
  const items = [];
  if (addedTools.length) items.push({ key: 'tools', label: '新增工具', value: addedTools.join('、') });
  if (addedMaterials.length) items.push({ key: 'materials', label: '新增材料', value: addedMaterials.join('、') });
  if (record.techniques && preparation && preparation.steps && record.techniques.trim() !== preparation.steps.trim()) {
    items.push({ key: 'steps', label: '步骤调整', value: record.techniques.trim() });
  }
  const expected = Number(preparation && preparation.estimatedMinutes);
  if (durationMinutes && expected && Math.abs(durationMinutes - expected) >= 15) {
    const delta = durationMinutes - expected;
    items.push({ key: 'duration', label: '耗时变化', value: `${Math.abs(delta)} 分钟${delta > 0 ? '更长' : '更短'}（本次 ${durationMinutes} 分钟）` });
  }
  return items;
}
function chipsFromHistory(order, field) {
  const records = ((order && order.customer && order.customer.serviceRecords) || []);
  return suggestionsFromValues(records.map(record => record[field]), 6);
}
function listItems(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result && result.data)) return result.data;
  if (Array.isArray(result && result.list)) return result.list;
  return [];
}

function buildCustomerFactCandidates(values, profileFacts, selectedKeys) {
  const definitions = [
    { field: 'preferenceNotes', category: 'preference', label: '稳定偏好' },
    { field: 'clientRequests', category: 'communication', label: '沟通与需求' },
    { field: 'discomfortNotes', category: 'reminder', label: '不适与异常' },
    { field: 'nextServiceNotes', category: 'reminder', label: '下次服务提醒' }
  ];
  return definitions.reduce((result, definition) => {
    const content = String(values[definition.field] || '').trim();
    if (!content) return result;
    const key = `${definition.category}:${content}`;
    const fact = (profileFacts || []).find(item => item.category === definition.category && String(item.content || '').trim() === content);
    const conflicts = (profileFacts || []).filter(item => item.status !== 'pending' && item.category === definition.category && String(item.content || '').trim() !== content);
    const recordUpdatedAt = values.updatedAt ? new Date(values.updatedAt).getTime() : 0;
    const factConfirmedAt = fact && fact.lastConfirmedAt ? new Date(fact.lastConfirmedAt).getTime() : 0;
    const needsResync = Boolean(fact && fact.sourceRecordId === values.id && recordUpdatedAt > factConfirmedAt);
    result.push({
      key,
      category: definition.category,
      label: definition.label,
      content,
      synced: Boolean(fact) && !needsResync,
      needsResync,
      conflicts: conflicts.map(item => item.content),
      conflictText: conflicts.map(item => item.content).join('、'),
      confirmationCount: (fact && fact.confirmationCount) || 0,
      sourceRecordId: fact && fact.sourceRecordId,
      selected: (!fact || needsResync) && Boolean(selectedKeys && selectedKeys[key])
    });
    return result;
  }, []);
}

Page({
  data: {
    actualStartTime: '', actualEndTime: '', startDate: '', startTime: '', endDate: '', endTime: '',
    actualAmount: '', materialCost: '0', materials: '', tools: '', techniques: '', nailCondition: '',
    depositAmount: 0, isDepositPaid: false, balanceAmount: 0,
    customerFeedback: '', clientReaction: '', discomfortNotes: '', preferenceNotes: '', nextServiceNotes: '', careAdvice: '',
    preServiceNotes: '', clientRequests: '', reactionLevel: '',
    reactionOptions: REACTION_OPTIONS,
    safetyConfirmed: false, nailConditionConfirmed: false,
    safetyConfirmedText: '', nailConditionConfirmedText: '',
    customerAlerts: [], preparations: [],
    materialSuggestions: [], toolSuggestions: [], nailConditionSuggestions: [], preferenceSuggestions: [],
    saveState: '', lastSavedText: '', saveErrorText: '',
    beforePhotos: [], duringPhotos: [], afterPhotos: [],
    photoStages: [
      { key: 'before', label: '服务前' },
      { key: 'during', label: '服务中' },
      { key: 'after', label: '完成后' }
    ],
    orderStatus: '', submitting: false, uploading: false, loading: false, loaded: false, loadError: '',
    saved: false, customerId: 0, customerName: '', recordStatus: 'draft',
    recordId: 0,
    missingLabels: [], missingText: '',
    orderSummary: null, relatedWork: null, isRecordMode: false,
    detailDateText: '', detailDurationText: '', detailCompletedAtText: '',
    showProcessDetails: false,
    editingExisting: false,
    customerFactCandidates: [], customerSyncNotice: '', customerSyncFailed: false,
    syncWorkResult: false, syncingWork: false, workAssociation: null, workSyncNotice: '', workSyncFailed: false, workArchiveSynced: false, workArchiveNeedsSync: false, workArchiveVersion: 0, workReviewItems: [],
    showAssociationEditor: false, associationType: '', associationOptions: [], associationTargetId: 0, associationReason: '', correctingAssociation: false
  },

  async onLoad(options) {
    this.id = Number(options.id);
    this.isRecordMode = options.mode === 'record';
    this._dirty = false;
    this._saving = false;
    this._pendingSave = false;
    this._photoDirty = {};
    return this.loadOrder();
  },

  onHide() {
    this.flushSave();
  },

  onUnload() {
    this.flushSave();
  },

  async loadOrder() {
    if (this.data.loading) return;
    this.setData({ loading: true, loaded: false, loadError: '' });
    try {
      const order = await api.technician.orders.detail(this.id);
      const record = order.serviceRecord || {};
      this._profileFacts = ((order.customer || {}).profileFacts) || [];
      const beforePhotos = photosByStage(record, 'before');
      const duringPhotos = photosByStage(record, 'during');
      const afterPhotos = photosByStage(record, 'after');
      const serviceLineTitle = (order.serviceLines || []).map(item => item.nameSnapshot).filter(Boolean).join('、');
      const generatedWork = Array.isArray(order.worksFromOrder) ? order.worksFromOrder[0] : null;
      const relatedWork = generatedWork || order.sourceWork || null;
      const workAssociation = generatedWork
        ? { mode: 'update', workId: generatedWork.id, label: `将本次制作经验同步到「${generatedWork.title || '未命名作品'}」` }
        : order.sourceWork
          ? { mode: 'update', workId: order.sourceWork.id, label: `将本次制作经验同步到「${order.sourceWork.title || '参考作品'}」` }
          : { mode: 'create', workId: 0, label: '将完成照片与制作经验整理为作品草稿' };
      const actualStartTime = local(new Date(record.actualStartTime || order.confirmedStartTime || order.startTime));
      const actualEndTime = local(new Date(record.actualEndTime || new Date()));
      const detailStart = record.actualStartTime ? new Date(record.actualStartTime) : null;
      const detailEnd = record.actualEndTime ? new Date(record.actualEndTime) : null;
      const detailDateText = detailEnd
        ? formatBookingDate(detailEnd)
        : (detailStart ? formatBookingDate(detailStart) : '');
      const detailDurationText = detailStart && detailEnd && detailEnd > detailStart
        ? (() => {
            const mins = Math.round((detailEnd - detailStart) / 60000);
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return h > 0 ? `${h} 小时 ${m} 分钟` : `${m} 分钟`;
          })()
        : '';
      const detailDurationMinutes = detailStart && detailEnd && detailEnd > detailStart
        ? Math.round((detailEnd - detailStart) / 60000)
        : 0;
      const detailTimeRangeText = detailStart
        ? `${formatClock(detailStart)}${detailEnd ? ` - ${formatClock(detailEnd)}` : ''}`
        : '';
      const detailCompletedAtText = record.completedAt ? formatBookingDate(record.completedAt) : '';
      const missing = Array.isArray(record.missing) ? record.missing : [];
      const preparations = preparationsFromOrder(order);
      const preferenceFacts = (((order.customer || {}).profileFacts) || [])
        .filter(fact => fact.category === 'preference')
        .map(fact => fact.content);
      const reactionLevelText = (REACTION_OPTIONS.find(item => item.value === record.reactionLevel) || {}).label || '';
      const recordInsightGroups = [
        {
          key: 'before',
          title: '服务前观察',
          items: [
            { label: '甲面情况', value: record.nailCondition },
            { label: '注意事项', value: record.preServiceNotes },
            { label: '临时需求', value: record.clientRequests }
          ].filter(item => item.value)
        },
        {
          key: 'process',
          title: '制作信息',
          items: [
            { label: '使用材料', value: record.materials },
            { label: '使用工具', value: record.tools },
            { label: '步骤与技法', value: record.techniques }
          ].filter(item => item.value)
        },
        {
          key: 'response',
          title: '客户反馈',
          items: [
            { label: '过程反应', value: record.clientReaction },
            { label: '反应状态', value: reactionLevelText },
            { label: '不适或异常', value: record.discomfortNotes },
            { label: '服务反馈', value: record.customerFeedback }
          ].filter(item => item.value)
        },
        {
          key: 'follow-up',
          title: '后续参考',
          items: [
            { label: '偏好观察', value: record.preferenceNotes },
            { label: '护理建议', value: record.careAdvice },
            { label: '下次准备', value: record.nextServiceNotes },
            { label: '安全信息', value: record.safetyConfirmedAt ? `已确认 ${clockText(new Date(record.safetyConfirmedAt))}` : '' }
          ].filter(item => item.value)
        }
      ].filter(group => group.items.length);
      const depositAmount = Number(order.depositAmount || 0);
      const isDepositPaid = Boolean(order.isDepositPaid);
      const rawActual = record.actualAmount ?? order.actualAmount ?? order.quotePrice ?? order.price ?? order.paidAmount ?? 0;
      const balanceAmount = isDepositPaid && depositAmount > 0
        ? Math.max(0, Math.round((Number(rawActual) - depositAmount) * 100) / 100)
        : Number(rawActual);
      this.setData({
        actualStartTime, actualEndTime,
        startDate: actualStartTime.slice(0, 10), startTime: actualStartTime.slice(11),
        endDate: actualEndTime.slice(0, 10), endTime: actualEndTime.slice(11),
        actualAmount: String(rawActual),
        depositAmount, isDepositPaid, balanceAmount,
        materialCost: String(record.materialCost ?? order.materialCost ?? 0),
        materials: record.materials || '', tools: record.tools || '', techniques: record.techniques || '',
        nailCondition: record.nailCondition || '', customerFeedback: record.customerFeedback || '',
        clientReaction: record.clientReaction || '', discomfortNotes: record.discomfortNotes || '',
        preferenceNotes: record.preferenceNotes || '', nextServiceNotes: record.nextServiceNotes || '', careAdvice: record.careAdvice || '',
        preServiceNotes: record.preServiceNotes || '', clientRequests: record.clientRequests || '',
        reactionLevel: record.reactionLevel || '',
        safetyConfirmed: Boolean(record.safetyConfirmedAt),
        nailConditionConfirmed: Boolean(record.nailConditionConfirmedAt),
        safetyConfirmedText: record.safetyConfirmedAt ? clockText(new Date(record.safetyConfirmedAt)) : '',
        nailConditionConfirmedText: record.nailConditionConfirmedAt ? clockText(new Date(record.nailConditionConfirmedAt)) : '',
        customerAlerts: alertsFromOrder(order),
        preparations,
        materialSuggestions: suggestionsFromValues([
          ...preparations.map(item => item.materials),
          ...chipsFromHistory(order, 'materials')
        ]),
        toolSuggestions: suggestionsFromValues([
          ...preparations.map(item => item.tools),
          ...chipsFromHistory(order, 'tools')
        ]),
        nailConditionSuggestions: suggestionsFromValues([
          ...NAIL_CONDITION_OPTIONS,
          ...chipsFromHistory(order, 'nailCondition')
        ]),
        preferenceSuggestions: suggestionsFromValues([
          ...preferenceFacts,
          ...PREFERENCE_OPTIONS,
          ...chipsFromHistory(order, 'preferenceNotes')
        ]),
        missingLabels: missing.map(key => MISSING_LABELS[key] || key),
        missingText: missing.map(key => MISSING_LABELS[key] || key).join('、'),
        beforePhotos, duringPhotos, afterPhotos,
        recordPhotoStages: [
          { key: 'before', label: '服务前', photos: beforePhotos },
          { key: 'during', label: '服务中', photos: duringPhotos },
          { key: 'after', label: '完成后', photos: afterPhotos }
        ],
        orderStatus: order.status, recordStatus: record.status || 'draft',
        recordId: record.id || 0,
        customerId: (order.customer && order.customer.id) || order.customerId || 0,
        customerName: (order.customer && order.customer.name) || order.customerName || '',
        orderSummary: {
          id: order.id,
          title: order.customTitle || serviceLineTitle || (order.service && order.service.name) || (order.sourceWork && order.sourceWork.title) || '预约服务',
          meta: `${formatBookingDate(order.startTime)} · ${ORDER_STATUS_LABELS[order.status] || '预约记录'}`,
          orderNo: order.orderNo || ''
        },
        relatedWork: relatedWork
          ? { ...relatedWork, relationText: generatedWork ? '本次服务作品' : '预约参考作品' }
          : null,
        workAssociation,
        customerFactCandidates: buildCustomerFactCandidates(record, this._profileFacts),
        workArchiveSynced: Boolean(record.id && relatedWork && relatedWork.preparation && relatedWork.preparation.sourceRecordId === record.id && new Date(relatedWork.preparation.updatedAt).getTime() >= new Date(record.updatedAt).getTime()),
        workArchiveNeedsSync: Boolean(record.id && relatedWork && relatedWork.preparation && relatedWork.preparation.sourceRecordId === record.id && new Date(relatedWork.preparation.updatedAt).getTime() < new Date(record.updatedAt).getTime()),
        workArchiveVersion: Number(relatedWork && relatedWork.preparation && relatedWork.preparation.version) || 0,
        workReviewItems: buildWorkReview(record, relatedWork && relatedWork.preparation, detailDurationMinutes),
        showProcessDetails: Boolean(
          duringPhotos.length || record.materials || record.tools || record.techniques || record.clientReaction || record.discomfortNotes
        ),
        isRecordMode: this.isRecordMode,
        detailDateText, detailTimeRangeText, detailDurationText, detailCompletedAtText,
        recordInsightGroups,
        loaded: true
      }, () => this._restoreLocalDraft(record));
    } catch (e) { this.setData({ loadError: e.message || '预约信息加载失败，请重试' }); }
    finally { this.setData({ loading: false }); }
  },

  input(e) {
    if (!this.data.loaded || this.data.submitting) return;
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const updates = { [field]: value };
    if (field === 'actualAmount') {
      const val = Number(value) || 0;
      const dep = this.data.isDepositPaid ? Number(this.data.depositAmount || 0) : 0;
      updates.balanceAmount = Math.max(0, Math.round((val - dep) * 100) / 100);
    }
    this.setData(updates, () => {
      if (['preferenceNotes', 'clientRequests', 'discomfortNotes', 'nextServiceNotes'].includes(field)) this.refreshCustomerFactCandidates();
      if (['tools', 'materials', 'techniques'].includes(field)) this.refreshWorkReview();
    });
    this.scheduleSave();
  },

  changeTime(e) {
    if (!this.data.loaded || this.data.submitting) return;
    const { field } = e.currentTarget.dataset;
    const values = { ...this.data, [field]: e.detail.value };
    this.setData({
      [field]: e.detail.value,
      actualStartTime: values.startDate && values.startTime ? `${values.startDate}T${values.startTime}` : '',
      actualEndTime: values.endDate && values.endTime ? `${values.endDate}T${values.endTime}` : ''
    }, () => this.refreshWorkReview());
    this.scheduleSave();
  },

  selectReaction(e) {
    if (!this.data.loaded || this.data.submitting || this.isRecordMode) return;
    const { value } = e.currentTarget.dataset;
    this.setData({ reactionLevel: this.data.reactionLevel === value ? '' : value });
    this.scheduleSave();
  },

  pickSuggestion(e) {
    if (!this.data.loaded || this.data.submitting || this.isRecordMode) return;
    const { field, value } = e.currentTarget.dataset;
    const current = String(this.data[field] || '').trim();
    if (current.split(/[、,，;；\n]+/).map(item => item.trim()).includes(value)) return;
    this.setData({ [field]: current ? `${current}、${value}` : value }, () => {
      if (['preferenceNotes', 'clientRequests', 'discomfortNotes', 'nextServiceNotes'].includes(field)) this.refreshCustomerFactCandidates();
      if (['tools', 'materials', 'techniques'].includes(field)) this.refreshWorkReview();
    });
    this.scheduleSave();
  },

  toggleProcessDetails() {
    if (!this.isRecordMode) this.setData({ showProcessDetails: !this.data.showProcessDetails });
  },

  toggleWorkSync() {
    if (!this.isRecordMode && !this.data.syncingWork) {
      this.setData({ syncWorkResult: !this.data.syncWorkResult });
    }
  },

  refreshCustomerFactCandidates() {
    const selectedKeys = {};
    (this.data.customerFactCandidates || []).forEach(item => { if (item.selected) selectedKeys[item.key] = true; });
    this.setData({
      customerFactCandidates: buildCustomerFactCandidates(this.data, this._profileFacts, selectedKeys)
    });
  },

  refreshWorkReview() {
    const start = new Date(this.data.actualStartTime);
    const end = new Date(this.data.actualEndTime);
    const durationMinutes = Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start
      ? Math.round((end.getTime() - start.getTime()) / 60000)
      : 0;
    this.setData({
      workReviewItems: buildWorkReview(
        this.data,
        this.data.relatedWork && this.data.relatedWork.preparation,
        durationMinutes
      )
    });
  },

  toggleCustomerFact(e) {
    if (this.isRecordMode || this.data.submitting) return;
    const key = e.currentTarget.dataset.key;
    this.setData({
      customerFactCandidates: (this.data.customerFactCandidates || []).map(item => (
        item.key === key && !item.synced ? { ...item, selected: !item.selected } : item
      ))
    });
  },

  selectedProfileFacts() {
    return (this.data.customerFactCandidates || [])
      .filter(item => item.selected && !item.synced)
      .map(item => ({ category: item.category, content: item.content }));
  },

  editRecord() {
    this.isRecordMode = false;
    this.setData({ isRecordMode: false, editingExisting: true, saved: false, showProcessDetails: true });
  },

  confirmSafety() {
    if (this.isRecordMode || this.data.safetyConfirmed) return;
    this.setData({ safetyConfirmed: true, safetyConfirmedText: clockText(new Date()) });
    this.scheduleSave(true);
  },

  confirmNailCondition() {
    if (this.isRecordMode || this.data.nailConditionConfirmed) return;
    this.setData({ nailConditionConfirmed: true, nailConditionConfirmedText: clockText(new Date()) });
    this.scheduleSave(true);
  },

  draftKey() {
    return `service_record_draft_${this.id}`;
  },

  scheduleSave(immediate) {
    if (!this.data.loaded || this.isRecordMode) return;
    this._dirty = true;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    if (immediate) {
      this._saveTimer = null;
      this.autoSave();
      return;
    }
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.autoSave();
    }, 800);
  },

  flushSave() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    if (this._dirty || Object.keys(this._photoDirty).length) this.autoSave();
  },

  async autoSave() {
    if (!this.data.loaded || this.isRecordMode) return;
    if (this._saving) {
      this._pendingSave = true;
      return;
    }
    const stages = Object.keys(this._photoDirty).filter(stage => this._photoDirty[stage]);
    if (!this._dirty && !stages.length) return;
    const payload = this.recordPayload();
    stages.forEach(stage => { payload[`${stage}Photos`] = this.data[`${stage}Photos`] || []; });
    this._dirty = false;
    this._photoDirty = {};
    this._saving = true;
    this.setData({ saveState: 'saving' });
    try {
      await api.technician.orders.saveServiceRecord(this.id, payload);
      this.setData({ saveState: 'saved', lastSavedText: clockText(new Date()), saveErrorText: '' });
      try { wx.removeStorageSync(this.draftKey()); } catch (e) { /* ignore */ }
    } catch (e) {
      this._dirty = true;
      this._persistLocalDraft();
      this.setData({ saveState: 'failed', saveErrorText: '自动保存失败，已存本机' });
    } finally {
      this._saving = false;
      if (this._pendingSave) {
        this._pendingSave = false;
        this.autoSave();
      }
    }
  },

  retrySave() {
    if (this.data.saveState === 'failed') this.scheduleSave(true);
  },

  _persistLocalDraft() {
    try {
      wx.setStorageSync(this.draftKey(), {
        savedAt: Date.now(),
        fields: this.recordPayload(),
        photos: {
          before: this.data.beforePhotos,
          during: this.data.duringPhotos,
          after: this.data.afterPhotos
        }
      });
    } catch (e) { /* ignore */ }
  },

  _restoreLocalDraft(record) {
    if (this.isRecordMode) return;
    let draft = null;
    try { draft = wx.getStorageSync(this.draftKey()); } catch (e) { draft = null; }
    if (!draft || !draft.fields) return;
    const serverUpdatedAt = record && record.updatedAt ? new Date(record.updatedAt).getTime() : 0;
    if (draft.savedAt && draft.savedAt <= serverUpdatedAt) {
      try { wx.removeStorageSync(this.draftKey()); } catch (e) { /* ignore */ }
      return;
    }
    wx.showModal({
      title: '发现本机草稿',
      content: '上次自动保存未成功，是否恢复本机内容？',
      confirmText: '恢复',
      cancelText: '忽略',
      success: res => {
        if (res.confirm) {
          const photos = draft.photos || {};
          this.setData({
            ...draft.fields,
            beforePhotos: photos.before || this.data.beforePhotos,
            duringPhotos: photos.during || this.data.duringPhotos,
            afterPhotos: photos.after || this.data.afterPhotos
          });
          this.scheduleSave(true);
        } else {
          try { wx.removeStorageSync(this.draftKey()); } catch (e) { /* ignore */ }
        }
      }
    });
  },

  choosePhotos(e) {
    const stage = e.currentTarget.dataset.stage;
    const key = `${stage}Photos`;
    const remaining = 9 - (this.data[key] || []).length;
    if (remaining < 1 || this.data.uploading) return;
    const selected = async files => {
      this.setData({ uploading: true });
      try {
        const urls = [];
        for (const file of files.slice(0, remaining)) {
          const result = await api.upload.image(file.tempFilePath || file.path, 'technician');
          if (result.url) urls.push(result.url);
        }
        this.setData({ [key]: [...this.data[key], ...urls] });
        this._photoDirty[stage] = true;
        if (this.isRecordMode) return;
        this.autoSave();
      } catch (err) { wx.showToast({ title: err.message || '照片上传失败', icon: 'none' }); }
      finally { this.setData({ uploading: false }); }
    };
    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({ count: remaining, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'], success: res => selected(res.tempFiles || []) });
    } else {
      wx.chooseImage({ count: remaining, sourceType: ['album', 'camera'], sizeType: ['compressed'], success: res => selected((res.tempFilePaths || []).map(tempFilePath => ({ tempFilePath }))) });
    }
  },

  removePhoto(e) {
    const { stage, index } = e.currentTarget.dataset;
    const key = `${stage}Photos`;
    this.setData({ [key]: this.data[key].filter((_, i) => i !== Number(index)) });
    this._photoDirty[stage] = true;
    if (this.isRecordMode) return;
    this.autoSave();
  },
  previewPhoto(e) {
    const key = `${e.currentTarget.dataset.stage}Photos`;
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data[key] });
  },

  openOrderDetail() {
    if (this.id) wx.navigateTo({ url: `/pages/technician/order-detail/index?id=${this.id}` });
  },

  openWorkDetail() {
    const work = this.data.relatedWork;
    if (work && work.id) wx.navigateTo({ url: `/pages/technician/work-detail/index?id=${work.id}` });
  },

  openCustomerDetail() {
    if (this.data.customerId) {
      wx.navigateTo({ url: `/pages/technician/customer-detail/index?id=${this.data.customerId}` });
    }
  },

  goPublishWork() {
    const work = this.data.relatedWork;
    if (work && work.id) {
      wx.navigateTo({
        url: `/pages/technician/work-edit/index?id=${work.id}&orderId=${this.id}`
      });
      return;
    }
    if (this.id) {
      wx.navigateTo({
        url: `/pages/technician/work-edit/index?orderId=${this.id}`
      });
    }
  },

  async openAssociationEditor(e) {
    const type = e.currentTarget.dataset.type;
    try {
      const result = type === 'customer'
        ? await api.technician.customers.list({ pageSize: 100 })
        : await api.technician.works.list({ pageSize: 100 });
      const currentId = type === 'customer' ? this.data.customerId : ((this.data.relatedWork && this.data.relatedWork.id) || 0);
      const options = listItems(result).map(item => ({
        id: Number(item.id), label: item.name || item.title || `#${item.id}`,
        selected: Number(item.id) === Number(currentId)
      }));
      this.setData({ showAssociationEditor: true, associationType: type, associationOptions: options, associationTargetId: currentId, associationReason: '' });
    } catch (error) {
      wx.showToast({ title: error.message || '关联列表加载失败', icon: 'none' });
    }
  },

  closeAssociationEditor() {
    if (!this.data.correctingAssociation) this.setData({ showAssociationEditor: false });
  },

  noop() {},

  selectAssociationTarget(e) {
    const id = Number(e.currentTarget.dataset.id);
    this.setData({ associationTargetId: id, associationOptions: this.data.associationOptions.map(item => ({ ...item, selected: item.id === id })) });
  },

  associationReasonInput(e) { this.setData({ associationReason: e.detail.value }); },

  async submitAssociationCorrection() {
    const reason = String(this.data.associationReason || '').trim();
    if (!this.data.associationTargetId) return wx.showToast({ title: '请选择关联对象', icon: 'none' });
    if (reason.length < 2) return wx.showToast({ title: '请填写更正原因', icon: 'none' });
    this.setData({ correctingAssociation: true });
    try {
      await api.technician.orders.correctServiceRecordAssociation(this.id, {
        entityType: this.data.associationType, targetId: this.data.associationTargetId, reason
      });
      this.setData({ showAssociationEditor: false, correctingAssociation: false });
      wx.showToast({ title: '关联已更正', icon: 'success' });
      await this.loadOrder();
    } catch (error) {
      this.setData({ correctingAssociation: false });
      wx.showToast({ title: error.message || '关联更正失败', icon: 'none' });
    }
  },

  recordPayload() {
    const d = this.data;
    return {
      materials: d.materials, tools: d.tools, techniques: d.techniques, nailCondition: d.nailCondition,
      customerFeedback: d.customerFeedback, clientReaction: d.clientReaction, discomfortNotes: d.discomfortNotes,
      preferenceNotes: d.preferenceNotes, nextServiceNotes: d.nextServiceNotes, careAdvice: d.careAdvice,
      preServiceNotes: d.preServiceNotes, clientRequests: d.clientRequests,
      reactionLevel: d.reactionLevel || undefined,
      safetyConfirmed: d.safetyConfirmed,
      nailConditionConfirmed: d.nailConditionConfirmed
    };
  },

  async syncRecordToWork(recordId) {
    const association = this.data.workAssociation;
    if (!this.data.syncWorkResult || !association) return { recordId, work: this.data.relatedWork, notice: '' };

    this.setData({ syncingWork: true });
    try {
      if (association.mode === 'create') {
        const work = await api.technician.works.createFromOrder(this.id);
        return {
          recordId,
          work: { ...work, relationText: '本次服务作品' },
          notice: '已创建作品草稿并同步作品档案'
        };
      }

      let resolvedRecordId = recordId;
      if (!resolvedRecordId) {
        const order = await api.technician.orders.serviceRecord(this.id);
        resolvedRecordId = order && order.serviceRecord && order.serviceRecord.id;
      }
      if (!resolvedRecordId) throw new Error('美甲记录尚未完成保存');
      const work = await api.technician.works.updatePreparationFromRecord(association.workId, resolvedRecordId);
      return {
        recordId: resolvedRecordId,
        work: { ...(this.data.relatedWork || {}), ...work },
        notice: '已同步到作品档案'
      };
    } finally {
      this.setData({ syncingWork: false });
    }
  },

  async syncCustomerFacts(profileFacts) {
    if (!profileFacts.length) return { facts: [], notice: '', failed: false };
    try {
      await api.technician.orders.saveServiceRecord(this.id, { profileFacts });
      return { facts: profileFacts, notice: `已同步 ${profileFacts.length} 条客户档案`, failed: false };
    } catch (error) {
      return { facts: [], notice: '美甲记录已保存，客户档案同步失败，可点击重试', failed: true };
    }
  },

  async finishSubmission(recordStatus, recordId, profileFacts) {
    const customerSync = await this.syncCustomerFacts(profileFacts);
    let synced = { recordId, work: this.data.relatedWork, notice: '' };
    let workSyncNotice = '';
    let workSyncFailed = false;
    if (recordStatus !== 'complete' && this.data.syncWorkResult) {
      workSyncNotice = '美甲记录待补全，完善后再同步作品';
    } else {
      try {
        synced = await this.syncRecordToWork(recordId);
        workSyncNotice = synced.notice;
      } catch (e) {
        workSyncNotice = '美甲记录已保存，作品同步失败，可稍后在作品中补充';
        workSyncFailed = true;
      }
    }
    this.setData({
      submitting: false,
      saved: true,
      recordStatus,
      recordId: synced.recordId || this.data.recordId,
      relatedWork: synced.work || this.data.relatedWork,
      workSyncNotice,
      workSyncFailed,
      customerSyncNotice: customerSync.notice,
      customerSyncFailed: customerSync.failed,
      customerFactCandidates: (this.data.customerFactCandidates || []).map(item => (
        customerSync.facts.some(fact => fact.category === item.category && fact.content === item.content)
          ? { ...item, selected: false, synced: true, needsResync: false, sourceRecordId: synced.recordId || recordId, confirmationCount: item.confirmationCount + 1 }
          : item
      )),
      workArchiveSynced: Boolean(workSyncNotice && !workSyncNotice.includes('失败') && !workSyncNotice.includes('待补全')),
      workArchiveNeedsSync: false,
      workArchiveVersion: Number(synced.work && synced.work.preparation && synced.work.preparation.version) || this.data.workArchiveVersion
    });
  },

  async retryCustomerSync() {
    if (this.data.submitting) return;
    const profileFacts = this.selectedProfileFacts();
    if (!profileFacts.length) return;
    this.setData({ submitting: true });
    const customerSync = await this.syncCustomerFacts(profileFacts);
    this.setData({
      submitting: false,
      customerSyncNotice: customerSync.notice,
      customerSyncFailed: customerSync.failed,
      customerFactCandidates: (this.data.customerFactCandidates || []).map(item => (
        customerSync.facts.some(fact => fact.category === item.category && fact.content === item.content)
          ? { ...item, selected: false, synced: true, needsResync: false, sourceRecordId: this.data.recordId, confirmationCount: item.confirmationCount + 1 }
          : item
      ))
    });
  },

  async retryWorkSync() {
    if (this.data.syncingWork) return;
    try {
      const synced = await this.syncRecordToWork(this.data.recordId);
      this.setData({
        relatedWork: synced.work || this.data.relatedWork,
        workSyncNotice: synced.notice,
        workSyncFailed: false,
        workArchiveSynced: true,
        workArchiveNeedsSync: false,
        workArchiveVersion: Number(synced.work && synced.work.preparation && synced.work.preparation.version) || this.data.workArchiveVersion
      });
    } catch (error) {
      this.setData({ workSyncNotice: '作品档案同步仍未成功，请稍后重试', workSyncFailed: true });
    }
  },

  async submit() {
    const d = this.data;
    if (!d.loaded || d.submitting || d.uploading || d.saved) return;
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    const profileFacts = this.selectedProfileFacts();
    if (d.orderStatus === 'completed') {
      const completeRecord = Boolean(d.nailCondition.trim() && d.reactionLevel && d.beforePhotos.length && d.afterPhotos.length);
      this.setData({ submitting: true });
      try {
        const result = await api.technician.orders.saveServiceRecord(this.id, {
          ...this.recordPayload(),
          beforePhotos: d.beforePhotos, duringPhotos: d.duringPhotos, afterPhotos: d.afterPhotos,
          complete: completeRecord
        });
        await this.finishSubmission(completeRecord ? 'complete' : 'draft', (result && result.id) || this.data.recordId, profileFacts);
      } catch (e) { this.setData({ submitting: false }); wx.showToast({ title: e.message || '保存失败', icon: 'none' }); }
      return;
    }
    if (!String(d.actualAmount).trim() || !String(d.materialCost).trim()) return wx.showToast({ title: '请填写实际支付金额和材料成本', icon: 'none' });
    const amount = Number(d.actualAmount), cost = Number(d.materialCost);
    const start = new Date(d.actualStartTime), end = new Date(d.actualEndTime);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return wx.showToast({ title: '请检查金额和服务时间', icon: 'none' });
    this.setData({ submitting: true });
    try {
      const result = await api.technician.orders.complete(this.id, {
        actualStartTime: start.toISOString(), actualEndTime: end.toISOString(), actualAmount: amount, materialCost: cost,
        ...this.recordPayload(),
        beforePhotos: d.beforePhotos, duringPhotos: d.duringPhotos, afterPhotos: d.afterPhotos,
        recordComplete: true
      });
      const resultRecord = result && result.serviceRecord;
      await this.finishSubmission(
        resultRecord && resultRecord.status === 'complete' ? 'complete' : (d.nailCondition.trim() && d.reactionLevel && d.beforePhotos.length && d.afterPhotos.length ? 'complete' : 'draft'),
        (resultRecord && resultRecord.id) || this.data.recordId,
        profileFacts
      );
    } catch (e) { this.setData({ submitting: false }); wx.showToast({ title: e.message || '完成失败', icon: 'none' }); }
  },

  finishAndBack() { if (!this.data.syncingWork) wx.navigateBack({ delta: 1 }); }
});
