const uiColors = require('../../../utils/colors');
const api = require('../../../services/api');
const RECORD_PAGE_SIZE = 8;

Page({
  data: {
    loading: true,
    loadFailed: false,
    allRecords: [],
    matchedRecords: [],
    records: [],
    recordLimit: RECORD_PAGE_SIZE,
    yearOptions: ['全部年份'],
    styleOptions: ['全部风格'],
    technicianOptions: ['全部美甲师'],
    selectedYearIndex: 0,
    selectedStyleIndex: 0,
    selectedTechnicianIndex: 0,
    totalSpent: 0,
    favoriteStyle: '待探索',
    favoriteScene: '日常',
    styleTags: [],
    recommendations: [],
    uploadingOrderId: null,
    editingRecordId: null,
    editingOrderId: null,
    noteDraft: '',
    savingNote: false
  },

  onLoad(options = {}) {
    this._recordOrderId = Number(options.orderId) || null;
    this._pageActive = true;
    this.loadRecords();
  },
  onShow() {
    this._pageActive = true;
    if (this._refreshOnShow) {
      this._refreshOnShow = false;
      this.loadRecords();
    }
  },
  onHide() { this._pageActive = false; },
  onUnload() { this._pageActive = false; },
  onPullDownRefresh() { this.loadRecords().finally(() => wx.stopPullDownRefresh()); },

  async loadRecords() {
    if (this._pageActive) this.setData({ loading: true, loadFailed: false });
    const selectedYear = this.data.yearOptions[this.data.selectedYearIndex];
    const selectedStyle = this.data.styleOptions[this.data.selectedStyleIndex];
    const selectedTechnician = this.data.technicianOptions[this.data.selectedTechnicianIndex];
    try {
      const res = await api.client.beautyArchive();
      const records = (res.records || []).map(normalizeRecord)
        .filter(item => !this._recordOrderId || Number(item.orderId) === this._recordOrderId);
      const summary = res.summary || {};
      const styleTags = summary.styleTags || [];
      if (!this._pageActive) return;
      this.setData({
        allRecords: records,
        matchedRecords: records,
        records: records.slice(0, RECORD_PAGE_SIZE),
        recordLimit: RECORD_PAGE_SIZE,
        yearOptions: ['全部年份'].concat(uniqueValues(records.map(item => item.yearText))),
        styleOptions: ['全部风格'].concat(uniqueValues(records.reduce((all, item) => all.concat(item.tags), []))),
        technicianOptions: ['全部美甲师'].concat(uniqueValues(records.map(item => item.technicianName))),
        totalSpent: summary.totalSpent || 0,
        favoriteStyle: summary.favoriteStyle || '待探索',
        favoriteScene: summary.favoriteScene || '待探索',
        styleTags,
        recommendations: (res.recommendations || []).map(work => ({
          ...work,
          tagText: (work.matchedTags || []).slice(0, 2).map(tag => `#${tag}`).join(' ')
        })),
        loading: false
      });
      this.setData({
        selectedYearIndex: Math.max(0, this.data.yearOptions.indexOf(selectedYear)),
        selectedStyleIndex: Math.max(0, this.data.styleOptions.indexOf(selectedStyle)),
        selectedTechnicianIndex: Math.max(0, this.data.technicianOptions.indexOf(selectedTechnician))
      }, () => this.applyRecordFilters());
    } catch (err) {
      console.error('load beauty archive error:', err);
      if (!this._pageActive) return;
      this.setData({ loading: false, loadFailed: true });
    }
  },

  onRecordFilterChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: Number(e.detail.value) }, () => this.applyRecordFilters());
  },

  resetRecordFilters() {
    this.setData({ selectedYearIndex: 0, selectedStyleIndex: 0, selectedTechnicianIndex: 0 }, () => this.applyRecordFilters());
  },

  applyRecordFilters() {
    const year = this.data.yearOptions[this.data.selectedYearIndex];
    const style = this.data.styleOptions[this.data.selectedStyleIndex];
    const technician = this.data.technicianOptions[this.data.selectedTechnicianIndex];
    const records = this.data.allRecords.filter(item => {
      if (this.data.selectedYearIndex && item.yearText !== year) return false;
      if (this.data.selectedStyleIndex && item.tags.indexOf(style) < 0) return false;
      if (this.data.selectedTechnicianIndex && item.technicianName !== technician) return false;
      return true;
    });
    this.setData({ matchedRecords: records, records: records.slice(0, RECORD_PAGE_SIZE), recordLimit: RECORD_PAGE_SIZE });
  },

  onReachBottom() {
    if (this.data.records.length >= this.data.matchedRecords.length) return;
    const recordLimit = this.data.recordLimit + RECORD_PAGE_SIZE;
    this.setData({ recordLimit, records: this.data.matchedRecords.slice(0, recordLimit) });
  },

  viewRecord(e) {
    const { type, id } = e.currentTarget.dataset;
    const path = type === 'work' ? '/pages/client/work-detail/index?id=' : '/pages/client/order-detail/index?id=';
    wx.navigateTo({ url: path + id });
  },
  previewRecordImage(e) {
    const record = this.data.records.find(item => item.id === e.currentTarget.dataset.recordId);
    if (!record) return;
    const current = e.currentTarget.dataset.url;
    const isClientPhoto = record.clientPhotos.indexOf(current) >= 0;
    const itemList = ['查看大图'];
    if (isClientPhoto) itemList.push('从本次记录中移除');
    wx.showActionSheet({
      itemList,
      success: result => {
        if (result.tapIndex === 0) {
          wx.previewImage({ current, urls: record.imageUrls });
        } else if (result.tapIndex === 1 && isClientPhoto) {
          this.removeRecordPhoto(record, current);
        }
      }
    });
  },
  async removeRecordPhoto(record, url) {
    const result = await wx.showModal({
      title: '移除照片',
      content: '只会从你的美甲记录中移除，不影响美甲师发布的作品。',
      confirmText: '确认移除',
      confirmColor: uiColors.action
    });
    if (!result.confirm || this.data.uploadingOrderId) return;
    this.setData({ uploadingOrderId: record.orderId });
    try {
      await api.client.orders.saveClientPhotos(record.orderId, record.clientPhotos.filter(item => item !== url));
      if (!this._pageActive) {
        this._refreshOnShow = true;
        return;
      }
      await this.loadRecords();
      wx.showToast({ title: '照片已移除', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '移除失败，请重试', icon: 'none' });
    } finally {
      this.setData({ uploadingOrderId: null });
    }
  },
  addRecordPhotos(e) {
    const orderId = Number(e.currentTarget.dataset.orderId);
    const record = this.data.records.find(item => item.orderId === orderId);
    if (!record || this.data.uploadingOrderId) return;
    const remaining = 9 - record.clientPhotos.length;
    if (remaining <= 0) {
      wx.showToast({ title: '每次记录最多上传9张照片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async res => {
        if (!this._pageActive) return;
        this.setData({ uploadingOrderId: orderId });
        wx.showLoading({ title: '正在保存照片' });
        try {
          const uploaded = [];
          for (const file of res.tempFiles) {
            const result = await api.upload.image(file.tempFilePath, 'client');
            uploaded.push(result.url);
          }
          await api.client.orders.saveClientPhotos(orderId, uniqueUrls(record.clientPhotos.concat(uploaded)));
          if (!this._pageActive) {
            this._refreshOnShow = true;
            return;
          }
          await this.loadRecords();
          if (this._pageActive) wx.showToast({ title: '已加入美甲记录', icon: 'success' });
        } catch (err) {
          if (this._pageActive) wx.showToast({ title: err.message || '照片保存失败', icon: 'none' });
        } finally {
          wx.hideLoading();
          this.setData({ uploadingOrderId: null });
        }
      }
    });
  },
  editRecordNote(e) {
    const record = this.data.records.find(item => item.id === e.currentTarget.dataset.recordId);
    if (!record || !record.orderId) return;
    this.setData({
      editingRecordId: record.id,
      editingOrderId: record.orderId,
      noteDraft: record.clientRecordNote || ''
    });
  },
  onNoteInput(e) { this.setData({ noteDraft: e.detail.value }); },
  closeNoteEditor() {
    if (!this.data.savingNote) this.setData({ editingRecordId: null, editingOrderId: null, noteDraft: '' });
  },
  async saveRecordNote() {
    if (this.data.savingNote || !this.data.editingOrderId) return;
    this.setData({ savingNote: true });
    try {
      await api.client.orders.saveClientRecordNote(this.data.editingOrderId, this.data.noteDraft);
      if (!this._pageActive) {
        this._refreshOnShow = true;
        return;
      }
      this.setData({ editingRecordId: null, editingOrderId: null, noteDraft: '' });
      await this.loadRecords();
      if (this._pageActive) wx.showToast({ title: '备注已保存', icon: 'success' });
    } catch (err) {
      if (this._pageActive) wx.showToast({ title: err.message || '备注保存失败', icon: 'none' });
    } finally {
      this.setData({ savingNote: false });
    }
  },
  noop() {},
  discoverWorks() { wx.navigateTo({ url: '/pages/client/works/index' }); },
  createPhoto(e) {
    const record = this.data.records.find(item => item.id === e.currentTarget.dataset.recordId);
    if (!record || !record.workId || !record.canShare) return;
    wx.navigateTo({ url: '/pages/client/work-detail/index?id=' + record.workId });
  },
  bookAgain(e) {
    const techId = Number(e.currentTarget.dataset.techId);
    wx.navigateTo({ url: `/pages/client/create-order/index${techId ? `?techId=${techId}` : ''}` });
  },
  viewWork(e) { wx.navigateTo({ url: '/pages/client/work-detail/index?id=' + e.currentTarget.dataset.id }); }
});

function normalizeRecord(item) {
  const date = new Date(item.serviceDate);
  const clientPhotos = uniqueUrls(item.clientPhotos || []);
  const imageUrls = uniqueUrls(item.imageUrls || (item.coverUrl ? [item.coverUrl] : []));
  return {
    id: item.id,
    targetType: item.targetType,
    targetId: item.targetId,
    title: item.title || '私人美甲服务',
    coverUrl: item.coverUrl || '',
    imageUrls,
    clientPhotos,
    clientRecordNote: item.clientRecordNote || '',
    orderId: item.orderId || null,
    workId: item.workId || (item.targetType === 'work' ? item.targetId : null),
    canShare: !!(item.permissions && item.permissions.canShare),
    linkedWorkPhotoCount: item.linkedWorkPhotoCount || 0,
    technicianId: item.technicianId || null,
    technicianName: item.technicianName || 'Luna',
    dateText: isNaN(date.getTime()) ? '' : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
    yearText: isNaN(date.getTime()) ? '' : String(date.getFullYear()),
    monthText: isNaN(date.getTime()) ? '' : `${date.getMonth() + 1}月`,
    dayText: isNaN(date.getTime()) ? '--' : String(date.getDate()).padStart(2, '0'),
    price: Number(item.price || 0),
    tags: item.tags || []
  };
}

function uniqueValues(values) {
  return values.filter((value, index, all) => value && all.indexOf(value) === index);
}

function uniqueUrls(urls) {
  return (urls || []).filter((url, index, all) => url && all.indexOf(url) === index);
}
