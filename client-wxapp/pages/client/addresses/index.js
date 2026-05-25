const api = require('../../../services/api');

Page({
  data: {
    addresses: [],
    loading: true
  },

  onShow() {
    this.loadAddresses();
  },

  async loadAddresses() {
    try {
      const res = await api.client.addresses.list();
      this.setData({ addresses: res.list || res.data || res || [], loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  addAddress() {
    wx.navigateTo({ url: '/pages/client/address-edit/index' });
  },

  editAddress(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/address-edit/index?id=${id}` });
  },

  async setDefault(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '设置中...' });
    try {
      await api.client.addresses.setDefault(id);
      wx.hideLoading();
      this.loadAddresses();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  deleteAddress(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除地址',
      content: '确定删除该地址吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        try {
          await api.client.addresses.delete(id);
          wx.hideLoading();
          this.loadAddresses();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
