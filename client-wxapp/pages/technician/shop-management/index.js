const api = require('../../../services/api');

Page({
  data: {
    shops: [],
    loading: true,
    showAddModal: false,
    editShop: null,
    name: '',
    address: '',
    phone: '',
    saving: false
  },

  async onLoad() {
    await this.loadShops();
  },

  async loadShops() {
    this.setData({ loading: true });
    try {
      const res = await api.technician.shops.list();
      this.setData({ shops: res.list || res.data || res || [], loading: false });
    } catch {
      this.setData({ loading: false });
    }
  },

  openAdd() {
    this.setData({ showAddModal: true, editShop: null, name: '', address: '', phone: '' });
  },

  openEdit(e) {
    const shop = e.currentTarget.dataset.shop;
    this.setData({ showAddModal: true, editShop: shop, name: shop.name, address: shop.address, phone: shop.phone || '' });
  },

  closeModal() {
    this.setData({ showAddModal: false, editShop: null });
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onAddressInput(e) { this.setData({ address: e.detail.value }); },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },

  async save() {
    if (this.data.saving) return;
    const { name, address, phone, editShop } = this.data;
    if (!name.trim()) { wx.showToast({ title: '请输入店铺名称', icon: 'none' }); return; }
    if (!address.trim()) { wx.showToast({ title: '请输入地址', icon: 'none' }); return; }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      if (editShop) {
        await api.technician.shops.update(editShop.id, { name, address, phone });
      } else {
        await api.technician.shops.create({ name, address, phone });
      }
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ showAddModal: false });
      await this.loadShops();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  deleteShop(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除店铺',
      content: `确定删除"${name}"吗？`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.technician.shops.delete(id);
          wx.showToast({ title: '已删除', icon: 'success' });
          await this.loadShops();
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
