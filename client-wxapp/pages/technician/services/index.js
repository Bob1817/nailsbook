const uiColors = require('../../../utils/colors');
const api = require('../../../services/api');

const CATEGORIES = {
  basic_care: '基础护理',
  color_style: '美色造型',
  extension_reinforcement: '延长加固',
  removal: '卸甲',
  surcharge_home: '上门服务费', surcharge_night: '晚间服务费', surcharge_holiday: '假日服务费'
};

Page({
  data: {
    services: [],
    depositModes: ['不收定金', '固定金额', '最终总价比例'], depositModeIndex: 0, depositInput: '', pricingSaving: false,
    loading: false,
    loadFailed: false,
    showForm: false,
    actionMenuId: null,
    editingId: null,
    form: { name: '', description: '', category: 'basic_care', price: '', durationMinutes: '' },
    categories: Object.entries(CATEGORIES).map(([value, label]) => ({ value, label })),
    categoryIndex: 0,
    submitting: false
  },

  onLoad() {
    this.loadServices();
    this.loadPricingSettings();
  },

  async loadPricingSettings() {
    try {
      const settings = await api.technician.services.pricingSettings();
      this.setData({ depositModeIndex: ['none', 'fixed', 'percentage'].indexOf(settings.depositMode), depositInput: String((settings.depositValue || 0) / 100) });
    } catch (err) { wx.showToast({ title: err.message || '定金设置加载失败', icon: 'none' }); }
  },
  onDepositMode(e) { this.setData({ depositModeIndex: Number(e.detail.value), depositInput: '' }); },
  onDepositInput(e) { this.setData({ depositInput: e.detail.value }); },
  async savePricingSettings() {
    if (this.data.pricingSaving) return;
    const value = this.data.depositModeIndex ? Math.round(Number(this.data.depositInput) * 100) : 0;
    if (!Number.isFinite(value) || value < 0 || (this.data.depositModeIndex === 2 && value > 10000)) return wx.showToast({ title: '请输入有效定金设置', icon: 'none' });
    this.setData({ pricingSaving: true });
    try {
      await api.technician.services.updatePricingSettings({ depositMode: ['none', 'fixed', 'percentage'][this.data.depositModeIndex], depositValue: value });
      wx.showToast({ title: '定金设置已保存', icon: 'success' });
    } catch (err) { wx.showToast({ title: err.message || '保存失败', icon: 'none' }); }
    finally { this.setData({ pricingSaving: false }); }
  },

  async loadServices() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const res = await api.technician.services.list();
      const services = (Array.isArray(res) ? res : (res.data || [])).map(s => ({
        ...s,
        categoryLabel: CATEGORIES[s.category] || s.category
      }));
      this.setData({ services, loadFailed: false });
    } catch (err) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  openCreate() {
    this.setData({
      showForm: true,
      actionMenuId: null,
      editingId: null,
      form: { name: '', description: '', category: 'basic_care', price: '', durationMinutes: '' },
      categoryIndex: 0
    });
  },

  openEdit(e) {
    const svc = this.data.services.find(s => s.id === e.currentTarget.dataset.id);
    if (!svc) return;
    const categoryIndex = this.data.categories.findIndex(c => c.value === svc.category);
    this.setData({
      showForm: true,
      actionMenuId: null,
      editingId: svc.id,
      form: {
        name: svc.name,
        description: svc.description || '',
        category: svc.category,
        price: svc.price != null ? String(svc.price) : '',
        durationMinutes: svc.durationMinutes != null ? String(svc.durationMinutes) : ''
      },
      categoryIndex: categoryIndex >= 0 ? categoryIndex : 0
    });
  },

  closeForm() {
    this.setData({ showForm: false });
  },

  toggleActionMenu(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ actionMenuId: this.data.actionMenuId === id ? null : id });
  },

  closeActionMenu() {
    this.setData({ actionMenuId: null });
  },

  onFormInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value);
    const category = this.data.categories[index].value;
    this.setData({ categoryIndex: index, 'form.category': category });
  },

  async handleSubmit() {
    const { form, editingId, submitting } = this.data;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入服务名称', icon: 'none' });
      return;
    }
    if (submitting) return;
    const price = Number(form.price);
    const durationMinutes = form.category.startsWith('surcharge_') ? 0 : Number(form.durationMinutes);
    if (!form.price || !Number.isFinite(price) || price < 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }
    if (!form.category.startsWith('surcharge_') && (!form.durationMinutes || !Number.isFinite(durationMinutes) || durationMinutes < 15)) {
      wx.showToast({ title: '服务时长不能少于15分钟', icon: 'none' });
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      price,
      durationMinutes
    };

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });
    try {
      if (editingId) {
        await api.technician.services.update(editingId, payload);
      } else {
        await api.technician.services.create(payload);
      }
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ showForm: false });
      await this.loadServices();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async toggleService(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ actionMenuId: null });
    try {
      await api.technician.services.toggle(id);
      const services = this.data.services.map(s =>
        s.id === id ? { ...s, isActive: !s.isActive } : s
      );
      this.setData({ services });
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  confirmDelete(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ actionMenuId: null });
    wx.showModal({
      title: '删除服务',
      content: '确定删除该服务项目吗？',
      confirmColor: uiColors.danger,
      success: (res) => {
        if (res.confirm) this.deleteService(id);
      }
    });
  },

  async deleteService(id) {
    wx.showLoading({ title: '删除中...' });
    try {
      await api.technician.services.delete(id);
      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });
      this.setData({ services: this.data.services.filter(s => s.id !== id) });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
