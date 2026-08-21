const api = require('../../../services/api');
const { phoneMask } = require('../../../utils/util');

Page({
  data: {
    avatar: '',
    nickname: '',
    phone: '',
    rawPhone: '',
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
    activeTechMenuId: null,

    // 角色能力（由 /client/auth/me 返回）
    capabilities: {
      hasBoundTechnician: false,
      isTechnician: false,
      isTechnicianActivated: false
    },

    // 原绑定美甲师弹窗
    showBindModal: false,
    inviteCode: '',
    bindNote: '',
    foundTech: null,
    checkingCode: false,
    binding: false,
    bindMode: 'invite',
    followedTechnicians: [],
    followedLoading: false,
    selectedFollowedTech: null,

    // 客户 → 美甲师：确认弹窗
    showSwitchConfirmModal: false,

    // 客户 → 美甲师：激活密钥弹窗
    showActivateModal: false,
    activationKey: '',
    activating: false,

    // 美甲师：绑定/切换弹窗
    showTechSwitchModal: false,
    techSwitchInviteCode: '',
    techSwitchFoundTech: null,
    techSwitchCheckingCode: false,
    techSwitchBinding: false,

    // 通用
    switchLoading: false
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

      // 仅当处于客户角色时刷新角色能力（用于切换身份判断）
      // 处于美甲师角色时 token 为技师 token，无法调用 /client/auth/me
      let capabilities = this.data.capabilities;
      if (currentRole === 'client' && roles.includes('client')) {
        try {
          const me = await api.auth.getUserInfo('client');
          if (me && me.capabilities) {
            capabilities = me.capabilities;
            if (me.technicians) wx.setStorageSync('client_bindings', me.technicians);
            if (me.phone) wx.setStorageSync('client_userInfo', Object.assign({}, userInfo || {}, { phone: me.phone }));
          }
        } catch (e) {
          console.warn('getUserInfo failed:', e);
        }
      }

      this.setData({
        avatar: userInfo?.avatarUrl || '',
        nickname: userInfo?.nickname || userInfo?.phone || '用户',
        phone: userInfo?.phone ? phoneMask(userInfo.phone) : '',
        rawPhone: userInfo?.phone || '',
        currentRole: currentRole,
        currentRoleLabel: isTechTourist ? '游客' : (currentRole === 'technician' ? '美甲师' : '客户'),
        isTourist: isTourist,
        isTouristLabel: isTechTourist ? '游客模式' : '',
        // 是否可切换为另一端
        canSwitchToTech: roles.includes('technician') || capabilities.isTechnicianActivated,
        canSwitchToClient: roles.includes('client'),
        // 身份卡片文案
        roleCardTitle: isTechTourist ? '当前身份：游客（美甲师）' : (currentRole === 'technician' ? '当前身份：美甲师' : '当前身份：客户'),
        roleCardSub: (() => {
          if (isTechTourist) return '设置密码后可发布作品、管理订单';
          if (currentRole === 'technician') return roles.includes('client') ? '可切换为客户模式' : '';
          return capabilities.isTechnicianActivated ? '可切换为美甲师模式' : '注册成为美甲师';
        })(),
        roleSwitchLabel: currentRole === 'technician' ? '切换为客户' : '切换身份',
        technicians: bindings.map(b => ({
          id: b.technician?.id || b.id,
          name: b.technician?.name || b.name || '美甲师',
          avatar: b.technician?.avatarUrl || b.avatarUrl || '',
          city: b.technician?.city || b.city || '',
          status: b.technician?.status || b.status || 'active',
          shopService: b.technician?.shopService || b.shopService || false,
          isDefault: b.isDefault || false
        })),
        capabilities
      });
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/client/settings/index' });
  },

  navigateToOrders() {
    wx.navigateTo({ url: '/pages/client/orders/index' });
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

  async requestAccountDeletion() {
    const result = await wx.showModal({
      title: '申请注销账号',
      content: '提交后需要运营方核验身份并处理未完成预约。注销完成后相关账号信息将按法律要求删除或匿名化。',
      confirmText: '继续申请',
      confirmColor: '#DC4C58'
    });
    if (result.confirm) {
      wx.navigateTo({ url: '/pages/client/feedback/index?action=account-deletion' });
    }
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

  // ===== 切换身份入口 =====
  switchRole() {
    const { currentRole, capabilities, isTourist } = this.data;

    if (currentRole === 'client') {
      // 客户 → 美甲师
      if (capabilities.isTechnicianActivated) {
        // 已激活：弹出确认
        this.setData({ showSwitchConfirmModal: true });
      } else {
        wx.showToast({ title: '首期不开放新美甲师入驻', icon: 'none' });
      }
      return;
    }

    if (currentRole === 'technician') {
      // 美甲师 → 显示绑定/切换弹窗
      this.setData({
        showTechSwitchModal: true,
        techSwitchInviteCode: '',
        techSwitchFoundTech: null,
        techSwitchCheckingCode: false,
        techSwitchBinding: false
      });
    }
  },

  // ===== 客户 → 已激活美甲师：确认切换 =====
  closeSwitchConfirmModal() {
    this.setData({ showSwitchConfirmModal: false });
  },

  async confirmSwitchToTechnician() {
    if (this.data.switchLoading) return;
    this.setData({ switchLoading: true, showSwitchConfirmModal: false });
    wx.showLoading({ title: '切换中...' });

    try {
      const res = await api.auth.selectRole('technician');
      wx.hideLoading();

      if (res.role === 'technician') {
        const app = getApp();
        const roles = res.roles || (res.technician ? ['client', 'technician'] : ['client']);
        const isTourist = res.isTourist != null ? res.isTourist : false;
        app.setLogin('technician', res.accessToken, res.technician, roles, isTourist);
        if (res.refreshToken) wx.setStorageSync('technician_refreshToken', res.refreshToken);
        wx.reLaunch({ url: '/pages/technician/home/index' });
      } else {
        wx.showToast({ title: '切换失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '切换失败', icon: 'none' });
    } finally {
      this.setData({ switchLoading: false });
    }
  },

  // ===== 客户 → 未开通美甲师：激活弹窗 =====
  closeActivateModal() {
    this.setData({ showActivateModal: false, activationKey: '' });
  },

  onActivationKeyInput(e) {
    this.setData({ activationKey: e.detail.value.trim() });
  },

  async activateTechnicianAccount() {
    const { activationKey } = this.data;
    if (!activationKey) {
      wx.showToast({ title: '请输入激活密钥', icon: 'none' });
      return;
    }
    if (this.data.activating) return;

    this.setData({ activating: true });
    wx.showLoading({ title: '开通中...' });

    try {
      const res = await api.auth.activateTechnician(activationKey);
      wx.hideLoading();

      if (res.accessToken) {
        const app = getApp();
        const roles = res.roles || ['client', 'technician'];
        app.setLogin('technician', res.accessToken, res.technician, roles, false);
        if (res.refreshToken) wx.setStorageSync('technician_refreshToken', res.refreshToken);
        wx.showToast({ title: '开通成功', icon: 'success' });
        this.setData({ showActivateModal: false, activationKey: '' });
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/technician/home/index' });
        }, 400);
      } else {
        wx.showToast({ title: '开通失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '激活失败', icon: 'none' });
    } finally {
      this.setData({ activating: false });
    }
  },

  // ===== 美甲师 → 绑定/切换弹窗 =====
  closeTechSwitchModal() {
    this.setData({ showTechSwitchModal: false });
  },

  async onTechSwitchInviteInput(e) {
    const code = e.detail.value.trim();
    this.setData({ techSwitchInviteCode: code, techSwitchFoundTech: null });

    if (code.length >= 4) {
      this.setData({ techSwitchCheckingCode: true });
      try {
        const tech = await api.client.profile.findTechByInviteCode(code);
        this.setData({ techSwitchFoundTech: tech });
      } catch {
        this.setData({ techSwitchFoundTech: null });
      } finally {
        this.setData({ techSwitchCheckingCode: false });
      }
    }
  },

  async bindTechnicianFromTechSwitch() {
    const { techSwitchFoundTech, techSwitchInviteCode } = this.data;
    if (!techSwitchFoundTech || this.data.techSwitchBinding) return;

    this.setData({ techSwitchBinding: true });
    wx.showLoading({ title: '申请中...' });

    try {
      await api.client.profile.bindTechnician(techSwitchFoundTech.id, techSwitchInviteCode, '', 'manual');
      wx.hideLoading();
      wx.showToast({ title: '申请已提交，待通过', icon: 'none' });
      this.setData({
        showTechSwitchModal: false,
        techSwitchInviteCode: '',
        techSwitchFoundTech: null
      });

      // 刷新用户数据
      const res = await api.auth.getUserInfo('client');
      if (res.technicians) wx.setStorageSync('client_bindings', res.technicians);
      this.loadProfile();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '绑定失败', icon: 'none' });
    } finally {
      this.setData({ techSwitchBinding: false });
    }
  },

  skipToClient() {
    this.setData({ showTechSwitchModal: false });
    this.switchToClient();
  },

  switchToClient() {
    const app = getApp();
    if (app.switchRole('client')) {
      wx.reLaunch({ url: '/pages/client/home/index' });
    } else {
      wx.showToast({ title: '切换失败', icon: 'none' });
    }
  },

  // ===== 我的美甲师相关 =====
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
    this.setData({ showBindModal: true, bindMode: 'invite', inviteCode: '', bindNote: '', foundTech: null, selectedFollowedTech: null });
  },

  closeBindModal() {
    this.setData({ showBindModal: false, inviteCode: '', bindNote: '', foundTech: null, selectedFollowedTech: null });
  },

  async switchBindMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ bindMode: mode, bindNote: '', selectedFollowedTech: null });
    if (mode !== 'followed' || this.data.followedLoading) return;
    this.setData({ followedLoading: true });
    try {
      const result = await api.client.profile.followedTechnicians();
      this.setData({ followedTechnicians: Array.isArray(result) ? result : (result.items || []) });
    } catch (error) {
      wx.showToast({ title: error.message || '关注列表加载失败', icon: 'none' });
    } finally {
      this.setData({ followedLoading: false });
    }
  },

  selectFollowedTech(e) {
    const id = Number(e.currentTarget.dataset.id);
    const selected = this.data.followedTechnicians.find((item) => Number(item.id) === id) || null;
    if (selected && selected.bindingStatus === 'pending') {
      wx.showToast({ title: '绑定申请审核中', icon: 'none' });
      return;
    }
    this.setData({ selectedFollowedTech: selected });
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
      if (res.bindings || res.technicians) {
        wx.setStorageSync('client_bindings', res.bindings || res.technicians);
      }
      this.loadProfile();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '绑定失败', icon: 'none' });
    } finally {
      this.setData({ binding: false });
    }
  },

  async requestFollowedBinding() {
    const { selectedFollowedTech, bindNote, binding } = this.data;
    if (!selectedFollowedTech || binding) return;
    this.setData({ binding: true });
    wx.showLoading({ title: '申请中...' });
    try {
      await api.client.profile.requestBinding(selectedFollowedTech.id, bindNote);
      wx.hideLoading();
      wx.showToast({ title: '申请已发送', icon: 'success' });
      this.closeBindModal();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '申请提交失败', icon: 'none' });
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
          if (refreshed.bindings || refreshed.technicians) wx.setStorageSync('client_bindings', refreshed.bindings || refreshed.technicians);
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
      if (res.bindings || res.technicians) wx.setStorageSync('client_bindings', res.bindings || res.technicians);
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
