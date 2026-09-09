const uiColors = require('../../../utils/colors');
const api = require('../../../services/api');

Page({
  data: {
    addresses: [],
    loading: true,
    loadFailed: false
  },

  onShow() {
    this.loadAddresses();
  },

  // skipNormalize: 归一化补选默认后再次拉取时传 true，避免重复
  async loadAddresses(skipNormalize) {
    this.setData({ loading: true, loadFailed: false });
    try {
      const res = await api.client.addresses.list();
      const list = res.list || res.data || res || [];

      // 约束：有地址时必须有且仅有一个默认地址。
      // 覆盖「单个地址即默认」「删除默认后补位」「历史无默认数据」三种情况。
      // 补选失败时不阻断列表渲染。
      if (skipNormalize !== true && list.length > 0 && !list.some(a => a.isDefault)) {
        try {
          await api.client.addresses.setDefault(list[0].id);
          return this.loadAddresses(true);
        } catch (e) {
          // 忽略，继续渲染原始列表
        }
      }

      this.setData({ addresses: list, loading: false, loadFailed: false });
    } catch (err) {
      this.setData({ loading: false, loadFailed: true });
    }
  },

  addAddress() {
    // 新增第一个地址时强制设为默认（默认地址不能为空）
    const forceDefault = this.data.addresses.length === 0 ? '?forceDefault=1' : '';
    wx.navigateTo({ url: '/pages/client/address-edit/index' + forceDefault });
  },

  editAddress(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/client/address-edit/index?id=${id}` });
  },

  async setDefault(e) {
    const { id, default: isDefault } = e.currentTarget.dataset;
    // 单选且必须保留一个默认地址：已是默认则不可取消
    if (isDefault) return;
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
      confirmColor: uiColors.danger,
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        try {
          await api.client.addresses.delete(id);
          wx.hideLoading();
          // 删除默认地址后，loadAddresses 的归一化会自动补选新的默认
          this.loadAddresses();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
