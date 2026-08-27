const api = require('../../../services/api');
const { createBlockId, normalizeGuidanceSection, serializeGuidanceSection } = require('../../../utils/shop-guidance');

const TABS = [
  { key: 'metro', label: '地铁' },
  { key: 'bus', label: '公交' },
  { key: 'driving', label: '开车' }
];

function emptySection() { return { blocks: [] }; }

Page({
  data: {
    tabs: TABS,
    activeTab: 0,
    activeMode: 'metro',
    activeLabel: '地铁',
    activeBlocks: [],
    shopName: '',
    shopAddress: '',
    metro: emptySection(),
    bus: emptySection(),
    driving: emptySection(),
    saving: false
  },

  onLoad(options) {
    this.setData({
      shopName: decodeURIComponent(options.name || ''),
      shopAddress: decodeURIComponent(options.address || '')
    });
    this.loadGuidance();
  },

  async loadGuidance() {
    wx.showLoading({ title: '加载中...' });
    try {
      const userInfo = await api.technician.auth.getUserInfo();
      const shops = userInfo.shopAddresses || [];
      const shop = shops.find(s =>
        s.name === this.data.shopName && s.detailAddress === this.data.shopAddress
      );

      if (!shop) {
        wx.hideLoading();
        wx.showToast({ title: '未找到店铺信息', icon: 'none' });
        return;
      }

      const g = (shop.guidance && typeof shop.guidance === 'object') ? shop.guidance : {};
      const metro = normalizeGuidanceSection(g.metro, 'metro');
      const bus = normalizeGuidanceSection(g.bus, 'bus');
      const driving = normalizeGuidanceSection(g.driving, 'driving');

      this.setData({
        metro,
        bus,
        driving,
        activeBlocks: metro.blocks
      });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  switchTab(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const mode = TABS[idx].key;
    this.setData({ activeTab: idx, activeMode: mode, activeLabel: TABS[idx].label, activeBlocks: this.data[mode].blocks });
  },

  updateBlocks(mode, blocks) {
    this.setData({ [`${mode}.blocks`]: blocks, activeBlocks: blocks });
  },

  addTextBlock() {
    const mode = this.data.activeMode;
    const blocks = [...this.data[mode].blocks, { id: createBlockId(mode, this.data[mode].blocks.length), type: 'text', text: '' }];
    this.updateBlocks(mode, blocks);
  },

  onBlockTextInput(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const mode = this.data.activeMode;
    const blocks = this.data[mode].blocks.map((block, index) => index === idx ? { ...block, text: e.detail.value } : block);
    this.updateBlocks(mode, blocks);
  },

  addImageBlock() {
    const mode = this.data.activeMode;
    const current = this.data[mode].blocks;
    const imageCount = current.filter((block) => block.type === 'image').length;
    const remaining = 9 - imageCount;
    if (remaining <= 0) {
      wx.showToast({ title: '最多添加9张图片', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });
        try {
          const urls = [];
          for (const file of res.tempFiles) {
            const result = await api.upload.image(file.tempFilePath, 'technician');
            urls.push(result.url);
          }
          wx.hideLoading();
          const blocks = [...this.data[mode].blocks];
          urls.forEach((url, index) => blocks.push({ id: createBlockId(mode, blocks.length + index), type: 'image', url }));
          this.updateBlocks(mode, blocks);
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '上传失败', icon: 'none' });
        }
      }
    });
  },

  deleteBlock(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const mode = this.data.activeMode;
    const block = this.data[mode].blocks[idx];
    wx.showModal({
      title: block && block.type === 'image' ? '删除图片' : '删除文字段',
      content: '删除后无法恢复，确定继续吗？',
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return;
        const blocks = [...this.data[mode].blocks];
        blocks.splice(idx, 1);
        this.updateBlocks(mode, blocks);
      }
    });
  },

  moveBlock(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const direction = e.currentTarget.dataset.direction;
    const mode = this.data.activeMode;
    const blocks = [...this.data[mode].blocks];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= blocks.length) return;
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    this.updateBlocks(mode, blocks);
  },

  previewImage(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const blocks = this.data[this.data.activeMode].blocks;
    const currentBlock = blocks[idx];
    const images = blocks.filter((block) => block.type === 'image').map((block) => block.url);
    wx.previewImage({
      current: currentBlock.url,
      urls: images
    });
  },

  async save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const userInfo = await api.technician.auth.getUserInfo();
      const shops = userInfo.shopAddresses || [];
      const shopIdx = shops.findIndex(s =>
        s.name === this.data.shopName && s.detailAddress === this.data.shopAddress
      );

      if (shopIdx < 0) {
        wx.hideLoading();
        wx.showToast({ title: '未找到店铺信息', icon: 'none' });
        this.setData({ saving: false });
        return;
      }

      const existingGuidance = (shops[shopIdx].guidance && typeof shops[shopIdx].guidance === 'object')
        ? shops[shopIdx].guidance
        : {};

      const guidance = {
        ...existingGuidance,
        enabled: existingGuidance.enabled === true,
        metro: serializeGuidanceSection(this.data.metro),
        bus: serializeGuidanceSection(this.data.bus),
        driving: serializeGuidanceSection(this.data.driving)
      };

      shops[shopIdx] = { ...shops[shopIdx], guidance };
      const hasEnabledShop = shops.some(s => s.enabled);

      await api.technician.auth.updateServiceType({
        shopService: hasEnabledShop,
        shopAddresses: shops
      });

      // 刷新本地缓存
      const fresh = await api.technician.auth.getUserInfo();
      const cached = wx.getStorageSync('userInfo') || {};
      Object.assign(cached, fresh);
      wx.setStorageSync('userInfo', cached);
      wx.setStorageSync('technician_userInfo', cached);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
