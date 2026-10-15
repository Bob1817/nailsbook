const api = require('../../../services/api');
const { syncSessionAvatar } = require('../../../utils/avatar');
const { normalizeBindings, bindingSummary } = require('../utils/client-bindings');
const { phoneMask } = require('../../../utils/util');

Page({
  data: {
    avatar: '',
    // 顶部个人信息区延伸到状态栏下方，由页面自行撑开安全区
    statusBarHeight: 0,
    navBarHeight: 0,
    avatarUploading: false,
    nickname: '',
    phone: '',
    rawPhone: '',
    technicians: [],
    previewTechnicians: [], activeCount: 0, visibleCount: 0, pendingCount: 0, hiddenActiveCount: 0, previewSummary: '',
    carouselIndex: 0, carouselScrollTarget: '',

    privateNotes: {}
  },

  onUnload() { this._avatarUnloaded = true; },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    const menuButton = wx.getMenuButtonBoundingClientRect();
    // 顶部区必须避开右上角胶囊按钮：导航栏高度 = 胶囊底部 + 与顶部等距留白
    const navBarHeight = menuButton.top + menuButton.height + (menuButton.top - systemInfo.statusBarHeight);
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 0,
      navBarHeight: Math.round(navBarHeight)
    });
    this.loadProfile();
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('client_userInfo');
      let bindings = wx.getStorageSync('client_bindings') || [];
      try {
        const me = await api.auth.getUserInfo('client');
        if (me && me.technicians) {
          bindings = [...me.technicians, ...(me.pendingTechnicians || [])];
          wx.setStorageSync('client_bindings', bindings);
        }
        if (me && me.phone) wx.setStorageSync('client_userInfo', Object.assign({}, userInfo || {}, { phone: me.phone }));
      } catch (e) {
        console.warn('getUserInfo failed:', e);
      }

      this.setData({
        avatar: userInfo?.avatarUrl || '',
        nickname: userInfo?.nickname || userInfo?.phone || '用户',
        phone: userInfo?.phone ? phoneMask(userInfo.phone) : '',
        rawPhone: userInfo?.phone || '',
        ...bindingSummary(normalizeBindings(bindings))
      });
      try {
        const notes = await api.client.profile.technicianNotes();
        this.setData({ privateNotes: Object.fromEntries(notes.map(note => [note.techId, note.content])) });
      } catch (_) { this.setData({ privateNotes: {} }); }
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  },

  async chooseAvatar(e) {
    if (this._avatarBusy) return;
    this._avatarBusy = true;
    try {
      // 使用微信原生头像选择能力，避免 wx.chooseImage 因隐私 API 未声明而被直接拦截。
      const filePath = e?.detail?.avatarUrl;
      if (!filePath) throw new Error('未读取到所选图片，请重新选择');
      const selectedFile = await new Promise((resolve, reject) => wx.getFileSystemManager().getFileInfo({
        filePath,
        success: resolve,
        fail: error => reject(new Error(error.errMsg || '无法读取所选头像'))
      }));
      if (selectedFile.size > 5 * 1024 * 1024) {
        throw new Error('头像不能超过5MB，请选择较小的图片');
      }
      const info = await new Promise((resolve, reject) => wx.getImageInfo({
        src: filePath,
        success: resolve,
        fail: error => reject(new Error(error.errMsg || '无法读取图片，请选择有效的 JPG、PNG 或 WebP 图片'))
      }));
      if (!['jpeg', 'jpg', 'png', 'webp'].includes(String(info.type).toLowerCase())) {
        throw new Error('头像仅支持 JPG、PNG、WebP 格式，请转换后重试');
      }
      if (this._avatarUnloaded) return;
      this.setData({ avatarUploading: true });
      const uploaded = await api.upload.image(filePath, 'client');
      if (!uploaded.url) throw new Error('头像上传未成功，请重试');
      await api.client.profile.update({ avatarUrl: uploaded.url });
      syncSessionAvatar('client', uploaded.url);
      if (!this._avatarUnloaded) {
        this.setData({ avatar: uploaded.url });
        wx.showToast({ title: '头像已更新', icon: 'success' });
      }
    } catch (error) {
      if (!this._avatarUnloaded && !/cancel/i.test(error.errMsg || '')) {
        const detail = error.message || error.errMsg || '无法选择或上传图片';
        const content = /privacy agreement|api scope/i.test(detail)
          ? '头像选择功能暂不可用，请更新小程序隐私保护指引后重试'
          : /auth deny|permission|authorize/i.test(detail)
          ? '没有相册访问权限，请在微信设置中允许访问照片后重试'
          : detail.replace(/^(chooseImage|chooseAvatar):fail\s*/i, '') || '无法选择或上传图片，请重试';
        wx.showModal({ title: '未能更换头像', content, showCancel: false });
      }
    } finally {
      this._avatarBusy = false;
      if (!this._avatarUnloaded) this.setData({ avatarUploading: false });
    }
  },

  editPrivateNote(e) {
    const id = Number(e.currentTarget.dataset.id);
    wx.showModal({ title: '私人备注', editable: true, placeholderText: '记录她的特点或你选择她的理由（仅自己可见）', content: (this.data.privateNotes || {})[id] || '', success: async result => {
      if (!result.confirm || this._noteSaving) return;
      const content = result.content || '';
      if (content.length > 200) return wx.showToast({ title: '备注最多 200 字', icon: 'none' });
      this._noteSaving = true;
      try {
        const note = await api.client.profile.saveTechnicianNote(id, content);
        this.setData({ privateNotes: { ...this.data.privateNotes, [id]: note.content } });
      } catch (error) { wx.showToast({ title: error.message || '保存失败，请重试', icon: 'none' }); }
      finally { this._noteSaving = false; }
    } });
  },
  preventBubble() {},

  editProfile() {
    wx.navigateTo({ url: '/pages/client/settings/index' });
  },

  navigateToArchive() { wx.navigateTo({ url: '/pages/client/beauty-archive/index' }); },

  navigateToOrders() {
    wx.navigateTo({ url: '/pages/client/orders/index' });
  },

  quickBookTechnician(e) {
    const id = Number(e.currentTarget.dataset.id);
    const canBook = e.currentTarget.dataset.canBook;
    if (!id) return;
    if (!canBook) {
      wx.showToast({ title: '美甲师当前休息，请稍后再预约', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/client/create-order/index?techId=${id}&mode=quick&source=profile_card` });
  },

  navigateToDesigns() {
    wx.navigateTo({ url: '/pages/client/designs/index' });
  },

  navigateToFavorites() {
    wx.navigateTo({ url: '/pages/client/my-favorites/index' });
  },

  navigateToLikes() {
    wx.navigateTo({ url: '/pages/client/my-likes/index' });
  },

  navigateToFeedback() {
    wx.navigateTo({ url: '/pages/client/feedback/index' });
  },

  requestAccountDeletion() {
    wx.navigateTo({ url: '/pages/account-deletion/index' });
  },

  navigateToManual() {
    wx.navigateTo({ url: '/pages/client/manual/index' });
  },

  navigateToAbout() {
    wx.navigateTo({ url: '/pages/technician/about/index' });
  },

  openAgreement(e) {
    const type = e.currentTarget.dataset.type || 'user';
    wx.navigateTo({ url: '/pages/client/agreement/index?type=' + type });
  },

  navigateToPassword() {
    wx.navigateTo({ url: '/pages/client/forgot-password/index' });
  },

  manageTechnicians() { wx.navigateTo({ url: '/pages/client/my-technicians/index' }); },

  onCarouselScroll(e) {
    const scrollLeft = e.detail.scrollLeft;
    const query = wx.createSelectorQuery();
    query.select('.tech-carousel-card').boundingClientRect(rect => {
      if (!rect) return;
      const gapPx = 12;
      const w = rect.width + gapPx;
      if (w <= 0) return;
      const idx = Math.round(scrollLeft / w);
      this.setData({ carouselIndex: Math.max(0, Math.min(idx, (this.data.previewTechnicians.length || 1) - 1)) });
    }).exec();
  },

  carouselPrev() {
    const target = Math.max(0, this.data.carouselIndex - 1);
    const tech = this.data.previewTechnicians[target];
    if (tech) this.setData({ carouselScrollTarget: 'carousel-' + tech.id, carouselIndex: target });
  },

  carouselNext() {
    const max = (this.data.previewTechnicians.length || 1) - 1;
    const target = Math.min(max, this.data.carouselIndex + 1);
    const tech = this.data.previewTechnicians[target];
    if (tech) this.setData({ carouselScrollTarget: 'carousel-' + tech.id, carouselIndex: target });
  },

  viewTechnicianHome(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/client/artist-home/index?id=' + id });
  },

  switchAccount() {
    wx.showModal({
      title: '切换账号',
      content: '将退出当前账号并返回登录页，是否继续？',
      confirmText: '继续切换',
      success: (res) => {
        if (!res.confirm) return;
        getApp().logout();
        wx.reLaunch({ url: '/pages/login/index' });
      }
    });
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          wx.reLaunch({ url: '/pages/login/index' });
        }
      }
    });
  }
});
