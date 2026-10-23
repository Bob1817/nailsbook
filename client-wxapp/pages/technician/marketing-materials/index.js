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
    overviewLoading: true,
    overviewLoadFailed: false,
    completionPercent: 0,
    completionDoneCount: 0,
    completionItems: [],
    loading: true,
    saving: false,
    exporting: false,
    previewing: false,
    loadFailed: false,
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

  onShow() {
    this.loadMarketingOverview();
  },

  async loadMarketingOverview() {
    this.setData({ overviewLoading: true, overviewLoadFailed: false });
    const cachedUser = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
    try {
      const [profile, brand, worksResult] = await Promise.all([
        api.technician.auth.getUserInfo().catch(() => cachedUser),
        api.technician.brandProfile.get(),
        api.technician.works.list()
      ]);
      const works = worksResult.list || worksResult.data || worksResult || [];
      const homepageReady = brand.publicationStatus === 'published';
      const worksReady = works.some(item => (
        item.publicationStatus === 'approved'
        && item.isVisible !== false
        && (item.visibilityScope || 'public') === 'public'
      ));
      const invitationReady = /^[A-Z0-9]{8}$/.test(String(profile.invitationCode || ''));
      const completionItems = [
        {
          key: 'homepage',
          route: 'homepage',
          label: '公开美甲师主页',
          hint: homepageReady ? '客户可通过分享查看主页' : '完善资料并发布主页',
          done: homepageReady
        },
        {
          key: 'works',
          route: 'works',
          label: '发布公开作品',
          hint: worksReady ? '已有作品可用于展示和分享' : '至少发布 1 个公开作品',
          done: worksReady
        },
        {
          key: 'customers',
          route: 'customers',
          label: '启用客户邀请',
          hint: invitationReady ? '邀请码可用于自动绑定客户' : '生成有效邀请码后即可邀请',
          done: invitationReady
        }
      ];
      const completionDoneCount = completionItems.filter(item => item.done).length;
      this.setData({
        overviewLoading: false,
        completionItems,
        completionDoneCount,
        completionPercent: Math.round((completionDoneCount / completionItems.length) * 100)
      });
    } catch {
      this.setData({ overviewLoading: false, overviewLoadFailed: true });
    }
  },

  openMarketingTool(e) {
    const route = e.currentTarget.dataset.route;
    if (route === 'quickQuote') return wx.navigateTo({ url: '/pages/technician/quick-quote/index' });
    if (route === 'homepage') return wx.navigateTo({ url: '/pages/technician/homepage-settings/index' });
    if (route === 'works') return wx.navigateTo({ url: '/pages/technician/works/index' });
    if (route === 'customers') return wx.switchTab({ url: '/pages/technician/customers/index' });
  },

  async loadMaterials() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const result = await api.technician.marketingMaterials.list();
      this.setData({ materials: result.list || result.data || result || [], loading: false });
    } catch {
      this.setData({ loading: false, loadFailed: true });
      wx.showToast({ title: '物料加载失败', icon: 'none' });
    }
  },

  onTitleInput(e) { this.setData({ title: e.detail.value, previewUrl: '' }); },
  onSubtitleInput(e) { this.setData({ subtitle: e.detail.value, previewUrl: '' }); },
  onPriceInput(e) { this.setData({ price: e.detail.value, previewUrl: '' }); },
  onContactInput(e) { this.setData({ contact: e.detail.value, previewUrl: '' }); },

  editMaterial(e) {
    if (this.data.saving || this.data.previewing || this.data.exporting) return;
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
    if (this.data.saving || this.data.previewing || this.data.exporting) return;
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
    if (this.data.saving || this.data.previewing || this.data.exporting) return;
    this.setData({ previewing: true, previewUrl: '' });
    try {
      const material = await this.saveDraft();
      if (!material) return;
      const result = await api.technician.marketingMaterials.preview(material.id);
      this.setData({ previewUrl: writePreviewFile(material.id, result.imageBase64) });
    } catch {
      wx.showToast({ title: '预览生成失败', icon: 'none' });
    } finally {
      this.setData({ previewing: false });
    }
  },

  async exportMaterial() {
    if (this.data.saving || this.data.previewing || this.data.exporting) return;
    this.setData({ exporting: true });
    try {
      const material = await this.saveDraft();
      if (!material) return;
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
