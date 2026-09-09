const api = require('../../../services/api');
const uiColors = require('../../../utils/colors');
const { normalizeBindings, bindingSummary } = require('../../../utils/client-bindings');
Page({
  data: {
    isBindingManager: true, technicians: [], activeCount: 0, pendingCount: 0, loading: true, loadFailed: false,
    showBindModal: false, inviteCode: '', inviteError: '', bindNote: '', foundTech: null,
    checkingCode: false, binding: false, bindMode: 'invite', followedTechnicians: [], followedLoading: false, selectedFollowedTech: null
  },
  onShow() { this.loadProfile(); },
  async loadProfile() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const me = await api.auth.getUserInfo('client');
      const bindings = [...(me.technicians || []), ...(me.pendingTechnicians || [])];
      wx.setStorageSync('client_bindings', bindings);
      this.setData(bindingSummary(normalizeBindings(bindings)));
    } catch (error) { this.setData({ loadFailed: true }); }
    finally { this.setData({ loading: false }); }
  },
  preventBubble() {},

  manageTechnicians() { wx.navigateTo({ url: '/pages/client/my-technicians/index' }); },
  // ===== 我的美甲师相关 =====
  viewTechnicianHome(e) {
    const { id } = e.currentTarget.dataset;
    if (id) wx.navigateTo({ url: `/pages/client/artist-home/index?id=${id}` });
  },

  callTechnician(e) {
    const { phone } = e.currentTarget.dataset;
    if (!phone) {
      wx.showToast({ title: '该美甲师暂未提供联系电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  messageTechnician(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/client/chat-detail/index?techId=${id}&techName=${encodeURIComponent(name || '美甲师')}` });
  },

  bookTechnician(e) {
    const { id } = e.currentTarget.dataset;
    if (id) wx.navigateTo({ url: `/pages/client/create-order/index?techId=${id}` });
  },

  // 绑定美甲师
  openBindModal() {
    if (!this.data.isBindingManager) return this.manageTechnicians();
    if (this.data.technicians.length >= 5) {
      wx.showToast({ title: '名额已满，请先管理已有绑定或申请', icon: 'none' });
      return;
    }
    this.setData({ showBindModal: true, bindMode: 'invite', inviteCode: '', inviteError: '', bindNote: '', foundTech: null, selectedFollowedTech: null });
  },

  closeBindModal() {
    this._inviteLookupSeq = (this._inviteLookupSeq || 0) + 1;
    this.setData({ showBindModal: false, inviteCode: '', inviteError: '', bindNote: '', foundTech: null, selectedFollowedTech: null, checkingCode: false });
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
    const code = String(e.detail.value || '').trim().toUpperCase().slice(0, 8);
    const lookupSeq = (this._inviteLookupSeq || 0) + 1;
    this._inviteLookupSeq = lookupSeq;
    if (code && !/^[A-Z0-9]+$/.test(code)) {
      this.setData({ inviteCode: code, inviteError: '无效邀请码，仅支持字母和数字', foundTech: null, checkingCode: false });
      return;
    }
    this.setData({ inviteCode: code, inviteError: '', foundTech: null, checkingCode: false });
    if (code.length < 8) return;
    this.setData({ checkingCode: true });
    try {
      const tech = await api.client.profile.findTechByInviteCode(code);
      if (lookupSeq !== this._inviteLookupSeq) return;
      const matchedCode = String(tech?.invitationCode || '').toUpperCase();
      if (!tech?.id || matchedCode !== code) throw new Error('无效邀请码');
      this.setData({ foundTech: tech, inviteError: '' });
    } catch {
      if (lookupSeq === this._inviteLookupSeq) {
        this.setData({ foundTech: null, inviteError: '无效邀请码，请向美甲师确认后重试' });
      }
    } finally {
      if (lookupSeq === this._inviteLookupSeq) this.setData({ checkingCode: false });
    }
  },

  async bindTechnician() {
    const { foundTech, inviteCode, bindNote, binding } = this.data;
    if (!foundTech || binding || !/^[A-Z0-9]{8}$/.test(inviteCode) || String(foundTech.invitationCode || '').toUpperCase() !== inviteCode) return;

    this.setData({ binding: true });
    wx.showLoading({ title: '申请中...' });

    try {
      await api.client.profile.bindTechnician(foundTech.id, inviteCode, bindNote);
      wx.hideLoading();
      wx.showToast({ title: '申请已提交，待通过', icon: 'none' });
      const pendingCard = {
        id: foundTech.id,
        name: foundTech.name || '美甲师',
        phone: foundTech.phone || '',
        avatar: foundTech.avatarUrl || '',
        city: foundTech.city || '',
        status: foundTech.status || 'active',
        bindingStatus: 'pending',
        shopService: !!foundTech.shopService,
        shopName: (foundTech.shopAddresses || []).find(shop => shop.enabled !== false)?.name || ''
      };
      this.setData({
        showBindModal: false,
        inviteCode: '',
        inviteError: '',
        bindNote: '',
        foundTech: null,
        ...bindingSummary([...this.data.technicians.filter(item => Number(item.id) !== Number(pendingCard.id)), pendingCard])
      });

      // 绑定已经成功；资料刷新失败不能回滚申请或误报“绑定失败”。
      try {
        const res = await api.auth.getUserInfo('client');
        if (res.bindings || res.technicians || res.pendingTechnicians) {
          wx.setStorageSync('client_bindings', [
            ...(res.bindings || res.technicians || []),
            ...(res.pendingTechnicians || [])
          ]);
        }
        this.loadProfile();
      } catch (refreshError) {
        console.warn('refresh pending binding failed:', refreshError);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '绑定失败', icon: 'none' });
    } finally {
      this.setData({ binding: false });
    }
  },

  async cancelBindingApplication(e) {
    if (this._bindingActionBusy) return;
    this._bindingActionBusy = true;
    const id = Number(e.currentTarget.dataset.id);
    if (!id) { this._bindingActionBusy = false; return; }
    try {
      await api.client.profile.cancelBindingApplication(id);
      this.setData(bindingSummary(this.data.technicians.filter(item => Number(item.id) !== id)));
      wx.setStorageSync('client_bindings', this.data.technicians);
      wx.showToast({ title: '绑定申请已取消', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '取消失败，请重试', icon: 'none' });
    } finally { this._bindingActionBusy = false; }
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
      await this.loadProfile();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '申请提交失败', icon: 'none' });
    } finally {
      this.setData({ binding: false });
    }
  },

  async unbindTechnician(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除美甲师',
      content: `确定解除与“${name || '该美甲师'}”的绑定吗？待报价、待确认等未完成预约将一并取消，历史记录保留。有待到店或进行中的预约时不能解绑。`,
      confirmText: '删除并解绑',
      confirmColor: uiColors.danger,
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await api.client.profile.unbindTechnician(id);
          wx.hideLoading();
          wx.showToast({ title: '已删除并解绑', icon: 'success' });
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


});
