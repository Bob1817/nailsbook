const uiColors = require('../../../utils/colors');
const api = require('../../../services/api');
const app = getApp();

Page({
  data: {
    design: null,
    loading: true,
    showQuoteModal: false,
    showEditModal: false,
    showDeleteModal: false,
    editTitle: '',
    editDescription: '',
    editImages: [],
    uploadingImage: false,
    savingEdit: false,
    deleting: false,
    requestingQuote: false,
    processingQuote: false
  },

  onLoad(options) {
    if (options.id) {
      this.designId = options.id;
      this.loadDesign();
    }
  },

  onShow() {
    if (this.designId) {
      this.loadDesign();
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/client/designs/index' }) });
  },

  async loadDesign() {
    try {
      const design = await api.client.designs.detail(this.designId);
      this.setData({
        design: {
          ...design,
          statusText: this.getStatusText(design.status),
          statusClass: this.getStatusClass(design.status),
          dateStr: this.formatDate(design.createdAt),
          technician: design.technician || null
        },
        loading: false,
        editTitle: design.title || '',
        editDescription: design.description || '',
        editImages: design.imageUrls || []
      });
    } catch (err) {
      console.error('Failed to load design:', err);
      this.setData({ loading: false });
    }
  },

  getStatusText(status) {
    const map = {
      'pending_quote': '待报价',
      'quoted': '已报价',
      'accepted': '已接受',
      'rejected': '已拒绝',
      'converted': '已转预约',
      'cancelled': '已取消'
    };
    return map[status] || status;
  },

  getStatusClass(status) {
    const map = {
      'pending_quote': 'status-pending',
      'quoted': 'status-quoted',
      'accepted': 'status-accepted',
      'rejected': 'status-rejected',
      'converted': 'status-converted',
      'cancelled': 'status-cancelled'
    };
    return map[status] || '';
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.design.imageUrls
    });
  },

  // 显示报价弹窗
  showQuoteModal() {
    this.setData({ showQuoteModal: true });
  },

  // 隐藏报价弹窗
  hideQuoteModal() {
    this.setData({ showQuoteModal: false });
  },

  // 发起报价请求
  async requestQuote() {
    this.setData({ requestingQuote: true });
    try {
      await api.client.designs.update(this.designId, { status: 'pending_quote' });
      await this.loadDesign();
      this.setData({ showQuoteModal: false });
      wx.showToast({ title: '报价请求已发送', icon: 'success' });
    } catch (err) {
      console.error('Request quote failed:', err);
      wx.showToast({ title: '发送失败', icon: 'none' });
    } finally {
      this.setData({ requestingQuote: false });
    }
  },

  // 接受报价
  async acceptQuote() {
    if (this.data.processingQuote) return;
    this.setData({ processingQuote: true });
    try {
      await api.client.designs.acceptQuote(this.designId);
      await this.loadDesign();
      wx.showToast({ title: '已接受报价', icon: 'success' });
    } catch (err) {
      console.error('Accept quote failed:', err);
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ processingQuote: false });
    }
  },

  async rejectQuote() {
    if (this.data.processingQuote) return;
    const result = await wx.showModal({ title: '拒绝报价', content: '拒绝后美甲师可以根据沟通结果重新报价。', confirmText: '确认拒绝', confirmColor: uiColors.danger });
    if (!result.confirm) return;
    this.setData({ processingQuote: true });
    try {
      await api.client.designs.rejectQuote(this.designId, '客户拒绝报价');
      await this.loadDesign();
      wx.showToast({ title: '已拒绝报价', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ processingQuote: false });
    }
  },

  // 发起预约
  goToCreateOrder() {
    const design = this.data.design;
    if (design && design.technician) {
      wx.navigateTo({
        url: `/pages/client/create-order/index?design_id=${this.designId}&tech_id=${design.technician.id}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/client/create-order/index?design_id=${this.designId}`
      });
    }
  },

  viewArtist() {
    const technician = this.data.design && this.data.design.technician;
    if (technician && technician.id) {
      wx.navigateTo({ url: `/pages/client/artist-home/index?id=${technician.id}` });
    }
  },

  // 查看预约
  goToOrders() {
    wx.navigateTo({ url: '/pages/client/orders/index' });
  },

  // 显示编辑弹窗
  showEditModal() {
    this.setData({ showEditModal: true });
  },

  // 隐藏编辑弹窗
  hideEditModal() {
    this.setData({ showEditModal: false });
  },

  // 编辑标题输入
  onEditTitleInput(e) {
    this.setData({ editTitle: e.detail.value });
  },

  // 编辑描述输入
  onEditDescInput(e) {
    this.setData({ editDescription: e.detail.value });
  },

  // 上传编辑图片
  uploadEditImage() {
    if (this.data.editImages.length >= 5) {
      wx.showToast({ title: '最多上传5张图片', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ uploadingImage: true });
        api.upload.image(res.tempFiles[0].tempFilePath)
          .then(result => {
            this.setData({
              editImages: [...this.data.editImages, result.url],
              uploadingImage: false
            });
          })
          .catch(err => {
            console.error('Upload failed:', err);
            wx.showToast({ title: '图片上传失败', icon: 'none' });
            this.setData({ uploadingImage: false });
          });
      }
    });
  },

  // 移除编辑图片
  removeEditImage(e) {
    const index = e.currentTarget.dataset.index;
    const editImages = [...this.data.editImages];
    editImages.splice(index, 1);
    this.setData({ editImages });
  },

  // 保存编辑
  async saveEdit() {
    if (this.data.savingEdit) return;
    this.setData({ savingEdit: true });
    try {
      await api.client.designs.update(this.designId, {
        title: this.data.editTitle.trim() || undefined,
        description: this.data.editDescription.trim() || undefined,
        imageUrls: this.data.editImages.length > 0 ? this.data.editImages : undefined
      });
      await this.loadDesign();
      this.setData({ showEditModal: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      console.error('Save failed:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingEdit: false });
    }
  },

  // 显示删除确认
  showDeleteModal() {
    this.setData({ showDeleteModal: true });
  },

  // 隐藏删除确认
  hideDeleteModal() {
    this.setData({ showDeleteModal: false });
  },

  // 删除设计
  async deleteDesign() {
    if (this.data.deleting) return;
    this.setData({ deleting: true });
    try {
      await api.client.designs.delete(this.designId);
      wx.showToast({ title: '删除成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('Delete failed:', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
      this.setData({ deleting: false });
    }
  }
});
