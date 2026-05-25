const api = require('../../../services/api');

const CATEGORIES = {
  basic_care: '基础护理',
  color_style: '美色造型',
  extension_reinforcement: '延长加固',
  removal: '卸甲'
};

Page({
  data: {
    services: [],
    loading: false,
    showForm: false,
    editingId: null,
    form: { name: '', description: '', category: 'basic_care' },
    categories: Object.entries(CATEGORIES).map(([value, label]) => ({ value, label })),
    categoryIndex: 0,
    submitting: false
  },

  onLoad() {
    this.loadServices();
  },

  async loadServices() {
    this.setData({ loading: true });
    try {
      const res = await api.technician.services.list();
      const services = (Array.isArray(res) ? res : (res.data || [])).map(s => ({
        ...s,
        categoryLabel: CATEGORIES[s.category] || s.category
      }));
      this.setData({ services });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  openCreate() {
    this.setData({
      showForm: true,
      editingId: null,
      form: { name: '', description: '', category: 'basic_care' },
      categoryIndex: 0
    });
  },

  openEdit(e) {
    const svc = this.data.services.find(s => s.id === e.currentTarget.dataset.id);
    if (!svc) return;
    const categoryIndex = this.data.categories.findIndex(c => c.value === svc.category);
    this.setData({
      showForm: true,
      editingId: svc.id,
      form: { name: svc.name, description: svc.description || '', category: svc.category },
      categoryIndex: categoryIndex >= 0 ? categoryIndex : 0
    });
  },

  closeForm() {
    this.setData({ showForm: false });
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

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category
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
    wx.showModal({
      title: '删除服务',
      content: '确定删除该服务项目吗？',
      confirmColor: '#ff4d4f',
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
