const api = require('../../services/api');
const privacy = require('../../utils/privacy');

function validatePassword(value) {
  if (!value || value.length < 8) return '密码至少 8 位';
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) return '密码需同时包含字母和数字';
  return '';
}

function parseCredential(input) {
  const raw = String(input || '').trim();
  if (!raw) return { type: 'none', value: '' };
  const normalized = /^https?:\/\//i.test(raw) ? raw : raw.toUpperCase();
  if (/^[A-Z0-9]{16}$/.test(normalized)) return { type: 'activationKey', value: normalized };
  if (/^https?:\/\//i.test(normalized)) {
    const match = normalized.match(/[?&/](?:invite|code|referral)[=/#]([A-Za-z0-9_-]+)/i);
    if (match) return { type: 'inviteCode', value: match[1].toUpperCase() };
    return { type: 'unknown', value: normalized };
  }
  if (/^[A-Z0-9_-]{4,12}$/.test(normalized)) return { type: 'inviteCode', value: normalized };
  return { type: 'unknown', value: normalized };
}

Page({
  data: {
    phone: '', inviteInput: '', inviteType: 'none', inviteParsedValue: '',
    inviteChecking: false, inviteValid: false, inviteTechName: '', inviteError: '',
    modeHint: '客户使用美甲师邀请码，美甲师使用系统激活密钥',
    name: '', password: '', confirmPassword: '', showPassword: false,
    privacyAgreed: false, loading: false, canSubmit: false
  },

  onLoad(options) {
    this.redirect = options.redirect ? decodeURIComponent(options.redirect) : '';
    this.registrationSource = options.source === 'card' ? 'card' : 'invite';
    const credential = options.invite || options.code || '';
    this.setData({ phone: options.phone || '' });
    if (credential) this.onInviteInput({ detail: { value: decodeURIComponent(credential) } });
    else this._updateCanSubmit();
  },

  onPhoneInput(e) {
    this.setData({ phone: String(e.detail.value || '').replace(/\D/g, '').slice(0, 11) });
    this._updateCanSubmit();
  },

  onInviteInput(e) {
    const raw = String(e.detail.value || '');
    const parsed = parseCredential(raw);
    const displayValue = /^https?:\/\//i.test(raw) ? raw : raw.toUpperCase();
    this._inviteLookupSeq = (this._inviteLookupSeq || 0) + 1;
    this.setData({
      inviteInput: displayValue, inviteType: parsed.type, inviteParsedValue: parsed.value,
      inviteValid: false, inviteTechName: '',
      inviteError: parsed.type === 'unknown' ? '无法识别，请检查邀请码或激活密钥' : '',
      modeHint: parsed.type === 'activationKey'
        ? '将创建美甲师账号，激活密钥会在注册时核验'
        : parsed.type === 'inviteCode' ? '正在核验邀请你的美甲师'
          : '客户使用美甲师邀请码，美甲师使用系统激活密钥'
    });
    if (parsed.type === 'inviteCode') this._debounceCheckInvite(parsed.value, this._inviteLookupSeq);
    this._updateCanSubmit();
  },

  _debounceCheckInvite(code, seq) {
    if (this._checkTimer) clearTimeout(this._checkTimer);
    this._checkTimer = setTimeout(() => this._checkInviteCode(code, seq), 400);
  },

  async _checkInviteCode(code, seq) {
    this.setData({ inviteChecking: true, inviteError: '' });
    try {
      const tech = await api.client.profile.findTechByInviteCode(code);
      if (seq !== this._inviteLookupSeq) return;
      if (!tech || !tech.name) throw new Error('invalid invite');
      this.setData({ inviteChecking: false, inviteValid: true, inviteTechName: tech.name, modeHint: `注册后将自动绑定 ${tech.name}` });
    } catch (_) {
      if (seq !== this._inviteLookupSeq) return;
      this.setData({ inviteChecking: false, inviteValid: false, inviteTechName: '', inviteError: '邀请码无效，请联系美甲师重新获取', modeHint: '客户注册必须使用有效的美甲师邀请码' });
    }
    this._updateCanSubmit();
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); this._updateCanSubmit(); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); this._updateCanSubmit(); },
  onConfirmPasswordInput(e) { this.setData({ confirmPassword: e.detail.value }); this._updateCanSubmit(); },
  togglePassword() { this.setData({ showPassword: !this.data.showPassword }); },
  onPrivacyAgreementChange(e) { this.setData({ privacyAgreed: (e.detail.value || []).includes('agree') }); this._updateCanSubmit(); },
  openUserAgreement() { wx.navigateTo({ url: '/pages/client/agreement/index?type=user' }); },
  openPrivacyPolicy() { privacy.openPrivacyContract(); },

  _updateCanSubmit() {
    const data = this.data;
    const credentialOk = data.inviteType === 'activationKey' || (data.inviteType === 'inviteCode' && data.inviteValid && !data.inviteChecking);
    const nameOk = data.inviteType !== 'activationKey' || data.name.trim().length >= 2;
    const passwordOk = !validatePassword(data.password) && data.password === data.confirmPassword;
    this.setData({ canSubmit: /^1[3-9]\d{9}$/.test(data.phone) && credentialOk && nameOk && passwordOk && data.privacyAgreed });
  },

  async handleSubmit() {
    if (this.data.loading) return;
    if (!this.data.inviteInput.trim()) { this.setData({ inviteError: '邀请码或激活密钥为必填项' }); return; }
    if (!privacy.requireAgreement(this) || !this.data.canSubmit) return;
    const { phone, inviteType, inviteParsedValue, name, password } = this.data;
    this.setData({ loading: true });
    wx.showLoading({ title: '注册中...', mask: true });
    try {
      const result = inviteType === 'activationKey'
        ? await api.auth.registerTechnician(inviteParsedValue, name.trim(), phone, password)
        : await api.auth.registerClient(phone, password, inviteParsedValue, this.registrationSource);
      await this._afterAuth(result, inviteType === 'activationKey' ? 'technician' : 'client');
    } catch (error) {
      wx.hideLoading(); this.setData({ loading: false });
      wx.showToast({ title: error.message || '注册失败', icon: 'none' });
    }
  },

  async _afterAuth(result, role) {
    const app = getApp();
    const token = result.accessToken || result.token;
    const userInfo = role === 'technician' ? (result.technician || result.userInfo) : (result.client || result.userInfo);
    app.setLogin(role, token, userInfo, result.roles || [role]);
    if (result.refreshToken) wx.setStorageSync(`${role}_refreshToken`, result.refreshToken);
    if (role === 'client' && result.technician) {
      wx.setStorageSync('client_bindings', result.technicians || [result.technician]);
      wx.setStorageSync('defaultTechId', result.technician.id);
    }
    wx.hideLoading(); this.setData({ loading: false });
    const redirect = role === 'client' && this.redirect
      ? '&redirect=' + encodeURIComponent(this.redirect)
      : '';
    wx.reLaunch({ url: `/pages/onboarding/index?role=${role}${redirect}` });
  },

  goBack() { wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/login/index' }) }); }
});
