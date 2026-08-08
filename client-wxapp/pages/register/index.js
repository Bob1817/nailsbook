/**
 * NailBook 统一注册页
 * 支持三种注册模式：
 * 1. 邀请码/邀请链接 → 注册为客户端 + 绑定美甲师
 * 2. 激活密钥（16位大写字母+数字）→ 注册为美甲师
 * 3. 无邀请码 → 注册为纯客户端（无绑定美甲师）
 */
const api = require('../../services/api');

function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) return '密码至少 8 位';
  if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return '密码需同时包含字母和数字';
  return null;
}

/**
 * 解析邀请码输入：自动识别邀请码、邀请链接、激活密钥
 */
function parseInviteInput(input) {
  if (!input) return { type: 'none', value: '' };
  input = input.trim();
  if (!input) return { type: 'none', value: '' };

  // 1. 激活密钥：16位大写字母+数字
  if (/^[A-Z0-9]{16}$/.test(input)) {
    return { type: 'activationKey', value: input };
  }

  // 2. 邀请链接：从 URL 中提取邀请码
  if (/^https?:\/\//i.test(input)) {
    const match = input.match(/[?&/](?:invite|code|referral)[=/#]([A-Za-z0-9_-]+)/i);
    if (match) return { type: 'inviteCode', value: match[1] };
    const parts = input.replace(/\/+$/, '').split('/');
    const last = parts[parts.length - 1];
    if (last && /^[A-Za-z0-9_-]{4,}$/.test(last)) {
      return { type: 'inviteCode', value: last };
    }
    return { type: 'unknown', value: input };
  }

  // 3. 普通邀请码（4位以上字母数字）
  if (/^[A-Za-z0-9_-]{4,}$/.test(input)) {
    return { type: 'inviteCode', value: input };
  }

  return { type: 'unknown', value: input };
}

Page({
  data: {
    phone: '',
    inviteInput: '',
    inviteType: 'none',       // 'none' | 'inviteCode' | 'activationKey' | 'unknown'
    inviteParsedValue: '',
    name: '',                  // 美甲师注册时需要
    password: '',
    confirmPassword: '',
    loading: false,
    showPassword: false,
    canSubmit: false,

    // 邀请码验证状态
    inviteChecking: false,
    inviteValid: false,        // 邀请码是否有效
    inviteTechName: '',        // 对应美甲师名称
    inviteError: '',           // 邀请码错误信息

    // 注册模式提示
    modeHint: '不填邀请码将注册为普通客户，部分功能将受限'
  },

  onLoad(options) {
    this.setData({
      phone: options.phone || ''
    });
    this._updateCanSubmit();
  },

  // ========== 邀请码输入与解析 ==========

  onInviteInput(e) {
    const raw = e.detail.value;
    this.setData({ inviteInput: raw, inviteError: '', inviteValid: false, inviteTechName: '' });

    const parsed = parseInviteInput(raw);
    this.setData({
      inviteType: parsed.type,
      inviteParsedValue: parsed.value
    });

    // 更新模式提示
    let modeHint = '不填邀请码将注册为普通客户，部分功能将受限';
    if (parsed.type === 'activationKey') {
      modeHint = '检测到激活密钥，将注册为美甲师账户';
    } else if (parsed.type === 'inviteCode') {
      modeHint = '检测到邀请码，将注册为客户端并绑定美甲师';
      // 自动验证邀请码
      this._debounceCheckInvite(parsed.value);
    } else if (parsed.type === 'unknown') {
      modeHint = '输入格式无法识别，请检查后重新输入';
    }
    this.setData({ modeHint });
    this._updateCanSubmit();
  },

  _checkTimer: null,
  _debounceCheckInvite(code) {
    if (this._checkTimer) clearTimeout(this._checkTimer);
    this._checkTimer = setTimeout(() => this._checkInviteCode(code), 500);
  },

  async _checkInviteCode(code) {
    this.setData({ inviteChecking: true, inviteError: '' });
    try {
      const tech = await api.client.profile.findTechByInviteCode(code);
      if (tech && tech.name) {
        this.setData({
          inviteValid: true,
          inviteTechName: tech.name,
          inviteChecking: false,
          inviteError: ''
        });
      } else {
        this.setData({
          inviteValid: false,
          inviteTechName: '',
          inviteChecking: false,
          inviteError: '该邀请码无效，请联系美甲师重新获取'
        });
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('异常') || msg.includes('禁用') || msg.includes('inactive')) {
        this.setData({
          inviteValid: false,
          inviteTechName: '',
          inviteChecking: false,
          inviteError: '该邀请码对应的美甲师账户异常，无法进行关联'
        });
      } else {
        this.setData({
          inviteValid: false,
          inviteTechName: '',
          inviteChecking: false,
          inviteError: '该邀请码无效，请联系美甲师重新获取'
        });
      }
    }
    this._updateCanSubmit();
  },

  // ========== 其他输入 ==========

  onNameInput(e) {
    this.setData({ name: e.detail.value });
    this._updateCanSubmit();
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
    this._updateCanSubmit();
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
    this._updateCanSubmit();
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  _updateCanSubmit() {
    const { phone, inviteType, inviteInput, inviteValid, inviteChecking, name, password, confirmPassword } = this.data;

    // 基础校验：手机号和密码
    const phoneOk = /^1[3-9]\d{9}$/.test(phone);
    const pwdErr = validatePassword(password);
    const pwdOk = !pwdErr && password === confirmPassword;

    // 邀请码校验
    let inviteOk = true;
    if (inviteInput.trim()) {
      if (inviteType === 'inviteCode') {
        inviteOk = inviteValid && !inviteChecking;
      } else if (inviteType === 'activationKey') {
        inviteOk = true; // 激活密钥格式正确即可，注册时再验证
      } else {
        inviteOk = false; // 未知格式
      }
    }

    // 美甲师注册需要姓名
    const nameOk = inviteType !== 'activationKey' || name.trim().length >= 2;

    const canSubmit = phoneOk && pwdOk && inviteOk && nameOk;
    this.setData({ canSubmit });
  },

  // ========== 提交注册 ==========

  async handleSubmit() {
    if (this.data.loading || !this.data.canSubmit) return;

    const { phone, inviteType, inviteParsedValue, name, password } = this.data;

    this.setData({ loading: true });
    wx.showLoading({ title: '注册中...', mask: true });

    try {
      let res;

      if (inviteType === 'activationKey') {
        // 模式1：激活密钥 → 注册美甲师
        res = await api.auth.registerTechnician(inviteParsedValue, name, phone, password);
        await this._afterAuth(res, 'technician');
      } else if (inviteType === 'inviteCode') {
        // 模式2：邀请码 → 注册客户端 + 绑定美甲师
        res = await api.auth.registerClient(phone, password, inviteParsedValue, 'invite');
        await this._afterAuth(res, 'client');
      } else {
        // 模式3：无邀请码 → 注册纯客户端
        res = await api.auth.registerClient(phone, password, '', '');
        await this._afterAuth(res, 'client');
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '注册失败', icon: 'none' });
    }
  },

  // ========== 注册后处理 ==========

  async _afterAuth(res, role) {
    const app = getApp();
    const roles = res.roles || [role];
    const token = res.accessToken || res.token;
    const userInfo = role === 'technician' ? (res.technician || res.userInfo) : (res.client || res.userInfo);

    app.setLogin(role, token, userInfo, roles);

    if (res.refreshToken) {
      wx.setStorageSync(role + '_refreshToken', res.refreshToken);
    }

    // 处理美甲师绑定信息（客户端角色时）
    if (role === 'client' && res.technician) {
      wx.setStorageSync('client_bindings', res.technicians || [res.technician]);
      wx.setStorageSync('defaultTechId', res.technician.id);
    }

    wx.hideLoading();
    this.setData({ loading: false });

    // 跳转到对应首页
    const homePage = role === 'technician'
      ? '/pages/technician/home/index'
      : '/pages/client/home/index';
    wx.reLaunch({ url: homePage });
  },

  // ========== 辅助 ==========

  goBack() {
    wx.navigateBack();
  }
});
