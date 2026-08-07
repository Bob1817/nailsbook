const api = require('../../../services/api');
const { phoneMask } = require('../../../utils/util');

Page({
  data: {
    avatar: '',
    nickname: '',
    phone: '',
    currentRole: 'client',
    currentRoleLabel: '客户',
    canSwitchToTech: false,
    canSwitchToClient: true,
    isTourist: false,
    isTouristLabel: '',
    roleCardTitle: '当前身份：客户',
    roleCardSub: '',
    roleSwitchLabel: '切换身份',
    technicians: [],
    showBindModal: false,
    inviteCode: '',
    bindNote: '',
    foundTech: null,
    checkingCode: false,
    binding: false,
    activeTechMenuId: null,
    showRoleSheet: false
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('client_userInfo');
      const bindings = wx.getStorageSync('client_bindings') || [];
      const currentRole = wx.getStorageSync('role') || 'client';
      const roles = wx.getStorageSync('roles') || ['client'];
      const isTourist = getApp().getIsTourist();

      // 技师是否已激活（非游客）
      const isTechActivated = currentRole === 'technician' && !isTourist;
      const isTechTourist = currentRole === 'technician' && isTourist;

      this.setData({
        avatar: userInfo?.avatarUrl || '',
        nickname: userInfo?.nickname || userInfo?.phone || '用户',
        phone: userInfo?.phone ? phoneMask(userInfo.phone) : '',
        currentRole: currentRole,
        currentRoleLabel: isTechTourist ? '游客' : (currentRole === 'technician' ? '美甲师' : '客户'),
        isTourist: isTourist,
        isTouristLabel: isTechTourist ? '游客模式' : '',
        // 是否可切换为另一端
        canSwitchToTech: roles.includes('technician'),
        canSwitchToClient: roles.includes('client'),
        // 身份卡片文案
        roleCardTitle: isTechTourist ? '当前身份：游客（美甲师）' : (currentRole === 'technician' ? '当前身份：美甲师' : '当前身份：客户'),
        roleCardSub: (() => {
          if (isTechTourist) return '设置密码后可发布作品、管理订单';
          if (currentRole === 'technician') return roles.includes('client') ? '可切换为客户模式' : '';
          return roles.includes('technician') ? '可切换为美甲师模式' : '注册成为美甲师';
        })(),
        roleSwitchLabel: currentRole === 'technician' ? '切换为客户' : '切换身份',
        technicians: bindings.map(b => ({
          id: b.technician?.id || b.id,
          name: b.technician?.name || b.name || '美甲师',
          avatar: b.technician?.avatarUrl || b.avatarUrl || '',
          city: b.technician?.city || b.city || '',
          status: b.technician?.status || b.status || 'active',
          homeService: b.technician?.homeService || b.homeService || false,
          shopService: b.technician?.shopService || b.shopService || false,
          isDefault: b.isDefault || false
        }))
      });
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/client/settings/index' });
  },

  navigateToAddresses() {
    wx.navigateTo({ url: '/pages/client/addresses/index' });
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

  navigateToReferrals() {
    wx.navigateTo({ url: '/pages/client/referrals/index' });
  },

  navigateToFeedback() {
    wx.navigateTo({ url: '/pages/client/feedback/index' });
  },

  navigateToManual() {
    wx.navigateTo({ url: '/pages/client/manual/index' });
  },

  openAgreement(e) {
    const type = e.currentTarget.dataset.type || 'user';
    wx.navigateTo({ url: '/pages/client/agreement/index?type=' + type });
  },

  navigateToPassword() {
    wx.navigateTo({ url: '/pages/client/forgot-password/index' });
  },

  switchRole() {
    // 改为弹出底部面板
    this.setData({ showRoleSheet: true });
  },

  showRoleSheet() {
    this.setData({ showRoleSheet: true });
  },

  hideRoleSheet() {
    this.setData({ showRoleSheet: false });
  },

  switchToTechnician() {
    const app = getApp();
    const currentRole = wx.getStorageSync('role') || 'client';
    const roles = wx.getStorageSync('roles') || ['client'];
    const isTourist = app.getIsTourist();

    this.setData({ showRoleSheet: false });

    if (currentRole === 'technician') {
      // 当前是美甲师（含游客） → 切换回客户
      if (app.switchRole('client')) {
        wx.reLaunch({ url: '/pages/client/home/index' });
      } else {
        wx.showToast({ title: '切换失败', icon: 'none' });
      }
      return;
    }

    // 当前是客户 → 尝试切换美甲师
    if (roles.includes('technician')) {
      // 已有美甲师 token → 直接切换
      if (app.switchRole('technician')) {
        wx.reLaunch({ url: '/pages/technician/home/index' });
      } else {
        wx.showToast({ title: '切换失败，请重试', icon: 'none' });
      }
    } else {
      // 未注册美甲师 → 引导到引导页
      wx.navigateTo({ url: '/pages/onboarding/index' });
    }
  },

  toggleTechMenu(e) {
    const id = Number(e.currentTarget.dataset.id);
    this.setData({ activeTechMenuId: this.data.activeTechMenuId === id ? null : id });
  },

  closeTechMenu() {
    if (this.data.activeTechMenuId !== null) this.setData({ activeTechMenuId: null });
  },

  viewTechnicianHome(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ activeTechMenuId: null });
    if (id) wx.navigateTo({ url: `/pages/client/artist-home/index?id=${id}` });
  },

  messageTechnician(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({ activeTechMenuId: null });
    wx.navigateTo({ url: `/pages/client/chat-detail/index?techId=${id}&techName=${encodeURIComponent(name || '美甲师')}` });
  },

  // 绑定美甲师
  openBindModal() {
    this.setData({ showBindModal: true, inviteCode: '', bindNote: '', foundTech: null });
  },

  closeBindModal() {
    this.setData({ showBindModal: false, inviteCode: '', bindNote: '', foundTech: null });
  },

  onBindNoteInput(e) {
    this.setData({ bindNote: e.detail.value });
  },

  async onInviteCodeInput(e) {
    const code = e.detail.value.trim();
    this.setData({ inviteCode: code, foundTech: null });

    if (code.length >= 4) {
      this.setData({ checkingCode: true });
      try {
        const tech = await api.client.profile.findTechByInviteCode(code);
        this.setData({ foundTech: tech });
      } catch {
        this.setData({ foundTech: null });
      } finally {
        this.setData({ checkingCode: false });
      }
    }
  },

  async bindTechnician() {
    const { foundTech, inviteCode, bindNote, binding } = this.data;
    if (!foundTech || binding) return;

    this.setData({ binding: true });
    wx.showLoading({ title: '申请中...' });

    try {
      await api.client.profile.bindTechnician(foundTech.id, inviteCode, bindNote);
      wx.hideLoading();
      wx.showToast({ title: '申请已提交，待通过', icon: 'none' });
      this.setData({ showBindModal: false, inviteCode: '', bindNote: '', foundTech: null });

      // 刷新用户数据
      const res = await api.auth.getUserInfo('client');
      if (res.bindings) {
        wx.setStorageSync('client_bindings', res.bindings);
      }
      this.loadProfile();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '绑定失败', icon: 'none' });
    } finally {
      this.setData({ binding: false });
    }
  },

  async unbindTechnician(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({ activeTechMenuId: null });
    wx.showModal({
      title: '解除绑定',
      content: `确定要解除与"${name}"的绑定吗？`,
      confirmText: '解除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.client.profile.unbindTechnician(id);
          wx.hideLoading();
          wx.showToast({ title: '已解除绑定', icon: 'success' });
          const refreshed = await api.auth.getUserInfo('client');
          if (refreshed.bindings) wx.setStorageSync('client_bindings', refreshed.bindings);
          this.loadProfile();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }
      }
    });
  },

  async setDefaultTech(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await api.client.profile.setDefaultTechnician(id);
      wx.showToast({ title: '已设为默认', icon: 'success' });
      const res = await api.auth.getUserInfo('client');
      if (res.bindings) wx.setStorageSync('client_bindings', res.bindings);
      this.loadProfile();
    } catch (err) {
      wx.showToast({ title: err.message || '设置失败', icon: 'none' });
    }
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
