const uiColors = require('../../../utils/colors');
const api = require('../../../services/api');
const { guardTourist } = require('../../../utils/permission');

function getShareState(work) {
  if (work.archivedAt) return { ready: false, key: 'needs_action', text: '已归档', reason: '已归档作品不可分享' };
  if (work.publicationStatus === 'draft') return { ready: false, key: 'needs_action', text: '草稿', reason: '请先提交作品审核' };
  if (work.publicationStatus === 'pending') return { ready: false, key: 'reviewing', text: '审核中', reason: '作品审核通过后可以分享' };
  if (work.publicationStatus === 'rejected') return { ready: false, key: 'needs_action', text: '审核未通过', reason: work.reviewNote || '请修改作品后重新提交审核' };
  if (work.isVisible === false) return { ready: false, key: 'needs_action', text: '已隐藏', reason: '请先将作品设为显示' };
  if (work.visibilityScope !== 'public') return { ready: false, key: 'needs_action', text: '仅授权客户可见', reason: '请将作品可见范围改为公开' };
  if (work.assetStatus !== 'public') return { ready: false, key: 'needs_action', text: '素材未公开', reason: '请先完成作品素材发布' };
  if (work.publicAuthorizationStatus !== 'authorized') return { ready: false, key: 'needs_action', text: '公开授权待完成', reason: '请先完成作品公开授权' };
  return { ready: true, key: 'shareable', text: '可公开分享', reason: '' };
}

function decorateWork(work, profile) {
  const shareState = getShareState(work);
  return {
    ...work,
    coverUrl: work.coverUrl || (work.imageUrls && work.imageUrls[0]) || '',
    tags: (Array.isArray(work.tags) ? work.tags : String(work.tags || '').split(',')).map(tag => String(tag).trim()).filter(Boolean),
    technicianId: profile.id || '',
    technicianName: profile.name || '我的作品',
    technicianAvatarUrl: profile.avatarUrl || '',
    techInitial: (profile.name || '我').charAt(0),
    expertiseText: profile.specialty || '',
    isShareReady: shareState.ready,
    shareStateKey: shareState.key,
    shareStatusText: shareState.text,
    shareBlockReason: shareState.reason
  };
}

Page({
  data: {
    works: [],
    leftCol: [],
    rightCol: [],
    filteredWorks: [],
    keyword: '',
    categoryFilters: ['全部分类'],
    selectedCategory: '全部分类',
    statusFilters: [
      { key: 'all', label: '全部' },
      { key: 'shareable', label: '可分享' },
      { key: 'needs_action', label: '待完善' },
      { key: 'hero', label: '首页主推' },
      { key: 'featured', label: '主页精选' },
      { key: 'hidden', label: '已隐藏' }
    ],
    selectedStatus: 'all',
    sortBy: 'updated',
    sortLabel: '最近更新',
    loading: false,
    loadFailed: false,
    selectedWorkId: null
  },

  onLoad() {},
  onShow() { this.loadWorks(); },
  onPullDownRefresh() { this.loadWorks().finally(() => wx.stopPullDownRefresh()); },

  async loadWorks() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const res = await api.technician.works.list({});
      const profile = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};
      const works = (Array.isArray(res) ? res : (res.data || [])).map((work) => decorateWork(work, profile));
      const categoryFilters = ['全部分类'].concat([...new Set(works.flatMap(work => work.tags || []))]);
      this.setData({ works, categoryFilters });
      this.applyFilters();
    } catch (err) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  splitIntoColumns(works) {
    const leftCol = [];
    const rightCol = [];
    works.forEach((work, index) => {
      if (index % 2 === 0) leftCol.push(work);
      else rightCol.push(work);
    });
    this.setData({ filteredWorks: works, leftCol, rightCol });
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilters();
  },

  clearKeyword() {
    this.setData({ keyword: '' });
    this.applyFilters();
  },

  selectCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.name });
    this.applyFilters();
  },

  selectStatus(e) {
    this.setData({ selectedStatus: e.currentTarget.dataset.key });
    this.applyFilters();
  },

  chooseSort() {
    const options = [
      { key: 'updated', label: '最近更新' },
      { key: 'likes', label: '点赞最多' },
      { key: 'favorites', label: '收藏最多' },
      { key: 'price', label: '价格从高到低' }
    ];
    wx.showActionSheet({ itemList: options.map(item => item.label), success: (res) => {
      const option = options[res.tapIndex];
      if (!option) return;
      this.setData({ sortBy: option.key, sortLabel: option.label });
      this.applyFilters();
    } });
  },

  applyFilters() {
    const keyword = String(this.data.keyword || '').trim().toLowerCase();
    const category = this.data.selectedCategory;
    const status = this.data.selectedStatus;
    const works = this.data.works.filter(work => {
      const text = [work.title].concat(work.tags || []).join(' ').toLowerCase();
      if (keyword && text.indexOf(keyword) < 0) return false;
      if (category !== '全部分类' && !(work.tags || []).includes(category)) return false;
      if (status === 'shareable' && !work.isShareReady) return false;
      if (status === 'needs_action' && work.shareStateKey !== 'needs_action' && work.shareStateKey !== 'reviewing') return false;
      if (status === 'hero' && !work.heroSlot) return false;
      if (status === 'featured' && !work.isFeatured) return false;
      if (status === 'hidden' && work.isVisible !== false) return false;
      return true;
    }).sort((a, b) => {
      if (this.data.sortBy === 'likes') return Number(b.likeCount || 0) - Number(a.likeCount || 0);
      if (this.data.sortBy === 'favorites') return Number(b.favoriteCount || 0) - Number(a.favoriteCount || 0);
      if (this.data.sortBy === 'price') {
        const priceFen = work => Number(work.standardPriceFen || 0) || Math.round(Number(work.standardPrice || work.price || 0) * 100);
        return priceFen(b) - priceFen(a);
      }
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
    this.splitIntoColumns(works);
  },

  /* ===== 操作菜单 ===== */
  showActions(e) {
    const source = e.detail || e.currentTarget.dataset;
    const { id, visible, pinned, featured, heroSlot } = source;
    this.setData({ selectedWorkId: id });

    const itemList = [
      visible ? '隐藏作品' : '显示作品',
      pinned ? '取消作品置顶' : '置顶作品',
      featured ? '移出主页精选' : '加入主页精选',
      heroSlot ? '取消客户首页推荐' : '推荐至客户首页',
      '编辑作品',
      '删除作品'
    ];

    wx.showActionSheet({
      itemList,
      success: (res) => {
        switch (res.tapIndex) {
          case 0: this.toggleVisible(id); break;
          case 1: this.togglePinned(id); break;
          case 2: this.toggleFeatured(id); break;
          case 3: wx.navigateTo({ url: '/pages/technician/hero-recommendations/index?' + (heroSlot ? 'removeWorkId=' : 'workId=') + id }); break;
          case 4: this.goEditById(id); break;
          case 5: this.confirmDelete(id); break;
        }
      }
    });
  },

  goCreate() {
    if (guardTourist('发布作品')) return;
    wx.navigateTo({ url: '/pages/technician/work-edit/index' });
  },
  goDetail(e) { wx.navigateTo({ url: '/pages/technician/work-detail/index?id=' + ((e.detail && e.detail.id) || e.currentTarget.dataset.id) }); },
  goEditById(id) { wx.navigateTo({ url: '/pages/technician/work-edit/index?id=' + id }); },

  async toggleVisible(id) {
    try {
      await api.technician.works.toggleVisible(id);
      const profile = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};
      const works = this.data.works.map(w => w.id === id ? decorateWork({ ...w, isVisible: !w.isVisible }, profile) : w );
      this.setData({ works });
      this.applyFilters();
      wx.showToast({ title: works.find(w => w.id === id)?.isVisible ? '作品已显示' : '作品已隐藏', icon: 'success' });
    } catch (err) { wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
  },

  async togglePinned(id) {
    try {
      await api.technician.works.togglePinned(id);
      const works = this.data.works.map(w => w.id === id ? { ...w, isPinned: !w.isPinned } : w );
      this.setData({ works });
      this.applyFilters();
      wx.showToast({ title: works.find(w => w.id === id)?.isPinned ? '作品已置顶' : '已取消作品置顶', icon: 'success' });
    } catch (err) { wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
  },

  async toggleFeatured(id) {
    try {
      await api.technician.works.toggleFeatured(id);
      const works = this.data.works.map(w => w.id === id ? { ...w, isFeatured: !w.isFeatured } : w );
      this.setData({ works });
      this.applyFilters();
      wx.showToast({ title: works.find(w => w.id === id)?.isFeatured ? '已加入主页精选' : '已移出主页精选', icon: 'success' });
    } catch (err) { wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
  },

  confirmDelete(id) {
    wx.showModal({
      title: '删除作品',
      content: '确定删除这个作品吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: uiColors.danger,
      success: (res) => { if (res.confirm) this.deleteWork(id); }
    });
  },

  async deleteWork(id) {
    wx.showLoading({ title: '删除中...' });
    try {
      await api.technician.works.delete(id);
      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });
      const works = this.data.works.filter(w => w.id !== id);
      this.setData({ works });
      this.applyFilters();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
