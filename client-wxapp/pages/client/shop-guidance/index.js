const api = require('../../../services/api');
const { normalizeGuidanceSection } = require('../../../utils/shop-guidance');

const TABS = [
  { key: 'metro', label: '地铁' },
  { key: 'bus', label: '公交' },
  { key: 'driving', label: '开车' }
];

Page({
  data: {
    tabs: TABS,
    activeTab: 0,
    activeMode: 'metro',
    activeBlocks: [],
    shopName: '',
    shopAddress: '',
    technicianName: '',
    guidance: null,
    shopLocation: null,
    hasContent: false,
    loading: true,
    loadFailed: false
  },

  onLoad(options) {
    this._techId = options.techId;
    this._shopName = decodeURIComponent(options.shopName || '');
    this._address = decodeURIComponent(options.address || '');
    this.loadGuidance();
  },

  async loadGuidance() {
    if (!this._techId) {
      this.setData({ loading: false, loadFailed: true });
      return;
    }
    this.setData({ loading: true, loadFailed: false });
    try {
      const result = await api.public.artists.shopGuidance(this._techId, {
        shopName: this._shopName,
        address: this._address
      });
      const shop = result.shop || {};
      const rawGuidance = result.guidance || {};
      const g = {
        ...rawGuidance,
        metro: normalizeGuidanceSection(rawGuidance.metro, 'metro'),
        bus: normalizeGuidanceSection(rawGuidance.bus, 'bus'),
        driving: normalizeGuidanceSection(rawGuidance.driving, 'driving')
      };
      const sectionHas = (s) => s && s.blocks.length > 0;

      // 构建带 hasContent 标记的 tabs
      const tabs = TABS.map(t => ({
        ...t,
        hasContent: !!sectionHas(g[t.key])
      }));

      // 找到第一个有内容的 tab
      const firstWithContent = tabs.findIndex(t => t.hasContent);

      const activeTab = firstWithContent >= 0 ? firstWithContent : 0;
      const activeMode = tabs[activeTab].key;
      this.setData({
        loading: false,
        hasContent: true,
        guidance: g,
        shopName: shop.name || '',
        shopAddress: [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join(''),
        technicianName: result.technicianName || '',
        tabs,
        activeTab,
        activeMode,
        activeBlocks: g[activeMode].blocks,
        shopLocation: (shop.latitude && shop.longitude) ? {
          latitude: parseFloat(shop.latitude),
          longitude: parseFloat(shop.longitude),
          name: shop.name || '',
          address: [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join('')
        } : null
      });
    } catch (err) {
      this.setData({ loading: false, loadFailed: true });
    }
  },

  switchTab(e) {
    const activeTab = parseInt(e.currentTarget.dataset.idx);
    const activeMode = this.data.tabs[activeTab].key;
    this.setData({ activeTab, activeMode, activeBlocks: this.data.guidance[activeMode].blocks });
  },

  previewImage(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const images = this.data.activeBlocks.filter((block) => block.type === 'image').map((block) => block.url);
    const current = this.data.activeBlocks[idx].url;
    wx.previewImage({
      current,
      urls: images
    });
  },

  navigateToShop() {
    const loc = this.data.shopLocation;
    if (!loc) return;
    wx.openLocation({
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: loc.name || '店铺位置',
      address: loc.address || '',
      scale: 18
    });
  },

  onShareAppMessage() {
    return {
      title: `${this.data.shopName || this.data.technicianName || '美甲工作室'}到店指引`,
      path: `/pages/client/shop-guidance/index?techId=${this._techId}&shopName=${encodeURIComponent(this.data.shopName || this._shopName || '')}&address=${encodeURIComponent(this.data.shopAddress || this._address || '')}`
    };
  }
});
