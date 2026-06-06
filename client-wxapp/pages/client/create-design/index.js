const api = require('../../../services/api');

Page({
  data: {
    images: [],
    title: '',
    description: '',
    uploading: false,
    submitting: false
  },

  onLoad() {},

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  chooseImage() {
    const remaining = 9 - this.data.images.length;
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ uploading: true });
        const uploadPromises = res.tempFiles.map(file => api.upload.image(file.tempFilePath));
        
        Promise.all(uploadPromises)
          .then(results => {
            const newImages = results.map(r => r.url);
            this.setData({
              images: [...this.data.images, ...newImages],
              uploading: false
            });
          })
          .catch(err => {
            console.error('Upload failed:', err);
            wx.showToast({ title: '图片上传失败', icon: 'none' });
            this.setData({ uploading: false });
          });
      }
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.images
    });
  },

  async handleSubmit() {
    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传一张图片', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await api.client.designs.create({
        title: this.data.title.trim() || undefined,
        imageUrls: this.data.images,
        description: this.data.description.trim() || undefined
      });

      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('Submit failed:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
