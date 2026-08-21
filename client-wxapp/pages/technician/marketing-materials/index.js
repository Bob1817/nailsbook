const api = require('../../../services/api');

function idempotencyKey(materialId) {
  return `material-${materialId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function writePreviewFile(materialId, imageBase64) {
  const filePath = `${wx.env.USER_DATA_PATH}/material-preview-${materialId}.png`;
  wx.getFileSystemManager().writeFileSync(filePath, imageBase64, 'base64');
  return filePath;
}

Page({
  data: {
    loading: true,
    saving: false,
    exporting: false,
    materials: [],
    editingId: null,
    title: '',
    subtitle: '',
    price: '',
    contact: '',
    previewUrl: ''
  },

  onLoad() {
    this.loadMaterials();
  },

  async loadMaterials() {
    this.setData({ loading: true });
    try {
      const result = await api.technician.marketingMaterials.list();
      this.setData({ materials: result.list || result.data || result || [], loading: false });
    } catch {
      this.setData({ loading: false });
      wx.showToast({ title: '物料加载失败', icon: 'none' });
    }
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onSubtitleInput(e) { this.setData({ subtitle: e.detail.value }); },
  onPriceInput(e) { this.setData({ price: e.detail.value }); },
  onContactInput(e) { this.setData({ contact: e.detail.value }); },

  editMaterial(e) {
    const material = this.data.materials.find(item => String(item.id) === String(e.currentTarget.dataset.id));
    if (!material) return;
    const content = material.content || {};
    this.setData({
      editingId: material.id,
      title: material.title || '',
      subtitle: content.subtitle || '',
      price: content.price == null ? '' : String(content.price),
      contact: content.contact || '',
      previewUrl: ''
    });
  },

  newMaterial() {
    this.setData({ editingId: null, title: '', subtitle: '', price: '', contact: '', previewUrl: '' });
  },

  async saveDraft() {
    const title = this.data.title.trim();
    if (!title) {
      wx.showToast({ title: '请输入物料标题', icon: 'none' });
      return null;
    }
    if (this.data.saving) return null;
    this.setData({ saving: true });
    const payload = {
      title,
      content: {
        subtitle: this.data.subtitle.trim(),
        price: this.data.price ? Number(this.data.price) : null,
        contact: this.data.contact.trim()
      }
    };
    try {
      const material = this.data.editingId
        ? await api.technician.marketingMaterials.update(this.data.editingId, payload)
        : await api.technician.marketingMaterials.create({ ...payload, type: 'work_poster' });
      this.setData({ editingId: material.id, saving: false });
      await this.loadMaterials();
      return material;
    } catch (err) {
      this.setData({ saving: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      return null;
    }
  },

  async previewMaterial() {
    const material = await this.saveDraft();
    if (!material) return;
    try {
      const result = await api.technician.marketingMaterials.preview(material.id);
      this.setData({ previewUrl: writePreviewFile(material.id, result.imageBase64) });
    } catch {
      wx.showToast({ title: '预览生成失败', icon: 'none' });
    }
  },

  async exportMaterial() {
    if (this.data.exporting) return;
    const material = await this.saveDraft();
    if (!material) return;
    this.setData({ exporting: true });
    try {
      const result = await api.technician.marketingMaterials.export(
        material.id,
        idempotencyKey(material.id)
      );
      const filePath = `${wx.env.USER_DATA_PATH}/${result.fileName || `material-${material.id}.png`}`;
      wx.getFileSystemManager().writeFileSync(filePath, result.imageBase64, 'base64');
      await new Promise((resolve, reject) => wx.saveImageToPhotosAlbum({ filePath, success: resolve, fail: reject }));
      wx.showToast({ title: result.charged ? '已导出并扣除额度' : '已免费重新导出', icon: 'success' });
      await this.loadMaterials();
    } catch (err) {
      const message = err && err.errMsg && err.errMsg.includes('auth deny')
        ? '请允许保存到相册'
        : (err.message || '导出失败');
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ exporting: false });
    }
  }
});
