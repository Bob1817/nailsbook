const api = require('../../../services/api');

Page({
  data: {
    isEdit: false,
    workId: null,
    title: '',
    description: '',
    tags: '',
    price: '',
    coverUrl: '',
    images: [],
    isVisible: true,
    uploading: false,
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, workId: options.id });
      this.loadWork(options.id);
    }
    wx.setNavigationBarTitle({ title: options.id ? '编辑作品' : '上传作品' });
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const work = await api.technician.works.detail(id);
      let images = [];
      try { images = JSON.parse(work.images || '[]'); } catch (e) {}
      this.setData({
        title: work.title || '',
        description: work.description || '',
        tags: work.tags || '',
        price: work.price != null ? String(work.price) : '',
        coverUrl: work.coverUrl || '',
        images,
        isVisible: work.isVisible !== false
      });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onVisibleChange(e) {
    this.setData({ isVisible: e.detail.value });
  },

  chooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        this.setData({ uploading: true });
        wx.showLoading({ title: '上传中...' });
        try {
          const result = await api.upload.image(filePath, 'technician');
          this.setData({ coverUrl: result.url });
          wx.hideLoading();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        } finally {
          this.setData({ uploading: false });
        }
      }
    });
  },

  addImage() {
    const remaining = 9 - this.data.images.length;
    if (remaining <= 0) {
      wx.showToast({ title: '最多9张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });
        try {
          const urls = [];
          for (const file of res.tempFiles) {
            const result = await api.upload.image(file.tempFilePath, 'technician');
            urls.push(result.url);
          }
          this.setData({ images: [...this.data.images, ...urls] });
          wx.hideLoading();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      }
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.filter((_, i) => i !== index);
    this.setData({ images });
  },

  validate() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入作品标题', icon: 'none' });
      return false;
    }
    if (!this.data.coverUrl) {
      wx.showToast({ title: '请上传封面图片', icon: 'none' });
      return false;
    }
    return true;
  },

  async handleSubmit() {
    if (!this.validate() || this.data.submitting) return;

    const { title, description, tags, price, coverUrl, images, isVisible, isEdit, workId } = this.data;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      tags: tags.trim() || undefined,
      price: price ? Number(price) : undefined,
      coverUrl,
      images: JSON.stringify(images),
      isVisible
    };

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    try {
      if (isEdit) {
        await api.technician.works.update(workId, payload);
      } else {
        await api.technician.works.create(payload);
      }
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  }
});
