const api = require('../../../services/api');
const { syncSessionAvatar } = require('../../../utils/avatar');
const { normalizeBindings, bindingSummary } = require('../../../utils/client-bindings');
const { phoneMask } = require('../../../utils/util');

Page({
  data: {
    avatar: '',
    avatarUploading: false,
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
    previewTechnicians: [], activeCount: 0, pendingCount: 0, hiddenActiveCount: 0, previewSummary: '',

    // 角色能力（由 /client/auth/me 返回）
    capabilities: {
      hasBoundTechnician: false,
      isTechnician: false,
      isTechnicianActivated: false
    },

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

  onUnload() { this._avatarUnloaded = true; },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('client_userInfo');
      let bindings = wx.getStorageSync('client_bindings') || [];
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
            if (me.technicians) {
              bindings = [
                ...me.technicians,
                ...(me.pendingTechnicians || [])
              ];
              wx.setStorageSync('client_bindings', bindings);
            }
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
        ...bindingSummary(normalizeBindings(bindings)),
        capabilities
      });
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

  manageTechnicians() { wx.navigateTo({ url: '/pages/client/my-technicians/index' }); },
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
