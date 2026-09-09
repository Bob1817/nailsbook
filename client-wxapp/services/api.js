// ========== 所有路径以 /api 为全局前缀（后端 setGlobalPrefix('api')）==========
// 客户端：/api/client/...   技师端：/api/technician/...

const api = require('../utils/request');
const { readShareRegistration, clearShareRegistration } = require('../utils/work-share-registration');
const { filterTagTemplates } = require('../utils/tag-templates');

function registerWithShare(path, payload) {
  return api.post(path, { ...payload, ...readShareRegistration() }, { needAuth: false }).then(result => {
    clearShareRegistration();
    return result;
  });
}

const C = '/api/client';
const T = '/api/technician';
const P = '/api/public';

function publicAssetUrl(url) {
  if (!url || /^https?:\/\//.test(url)) return url;
  let baseUrl = 'https://api.lunails.cn';
  try {
    const app = getApp();
    baseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || baseUrl;
  } catch (e) {}
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

function guidanceFromPublicArtist(result, params = {}) {
  const artist = result && result.artist || {};
  const shops = (Array.isArray(artist.shopAddresses) ? artist.shopAddresses : [])
    .filter((shop) => shop && shop.enabled !== false && shop.guidance && shop.guidance.enabled === true);
  const normalizedAddress = String(params.address || '').replace(/\s+/g, '');
  const shop = shops.find((item) => {
    if (params.shopName && item.name === params.shopName) return true;
    const fullAddress = [item.province, item.city, item.district, item.detailAddress]
      .filter(Boolean).join('').replace(/\s+/g, '');
    const detailAddress = String(item.detailAddress || '').replace(/\s+/g, '');
    return normalizedAddress && (fullAddress === normalizedAddress ||
      (detailAddress && normalizedAddress.includes(detailAddress)) ||
      fullAddress.includes(normalizedAddress));
  }) || (shops.length === 1 ? shops[0] : null);
  if (!shop) return null;
  const section = (value) => {
    const source = value && typeof value === 'object' ? value : {};
    return {
      blocks: (Array.isArray(source.blocks) ? source.blocks : []).map((block) =>
        block && block.type === 'image' ? { ...block, url: publicAssetUrl(block.url) } : block
      ).filter(Boolean),
      text: typeof source.text === 'string' ? source.text : '',
      images: (Array.isArray(source.images) ? source.images : []).map(publicAssetUrl)
    };
  };
  return {
    technicianId: artist.id,
    technicianName: artist.name,
    shop,
    guidance: {
      enabled: true,
      metro: section(shop.guidance.metro),
      bus: section(shop.guidance.bus),
      driving: section(shop.guidance.driving)
    }
  };
}

// ========== 鉴权 ==========
const auth = {
  wechatLogin: (code, role) =>
    api.post('/api/wechat/auth/login', { code, role }, { needAuth: false, silent: true }),
  /** 获取微信 session token（登录页 _getWechatSession 使用） */
  wechatSession: (code) =>
    api.post('/api/wechat/auth/login', { code }, { needAuth: false, silent: true }),
  completeWechatClient: (data) =>
    registerWithShare('/api/wechat/auth/client/complete', data),
  completeWechatTechnician: (data) =>
    api.post('/api/wechat/auth/technician/complete', data, { needAuth: false }),

  checkPhone: (phone, role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.post(`${base}/auth/check-phone`, { phone }, { needAuth: false });
  },

  registerClient: (phone, password, inviteCode, source) =>
    registerWithShare(`${C}/auth/register-by-invite`, { phone, password, inviteCode, source: source || undefined }),

  /** 新流程：SMS 免邀请码注册 */
  registerBySms: (phone, smsCode) =>
    registerWithShare(`${C}/auth/register-by-sms`, { phone, smsCode }),

  /** 新流程：SMS 验证码直接登录 */
  loginBySms: (phone, code) =>
    api.post(`${C}/auth/login-by-sms`, { phone, code }, { needAuth: false }),

  /** 新流程：使用激活密钥激活美甲师身份（需要客户 JWT） */
  activateTechnician: (activationKey) =>
    api.post(`${C}/auth/activate-technician`, { activationKey }, { needAuth: true }),

  /** 发送 SMS 登录验证码 */
  sendSmsCodeForLogin: (phone) =>
    api.post(`${C}/auth/send-sms-login`, { phone }, { needAuth: false }),

  /** 发送 SMS 注册验证码 */
  sendSmsCodeForRegister: (phone) =>
    api.post(`${C}/auth/send-sms-register`, { phone }, { needAuth: false }),

  registerTechnician: (inviteKey, name, phone, password) =>
    api.post(`${T}/auth/register`, { inviteKey, name, phone, password }, { needAuth: false }),

  login: (phone, password, role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.post(`${base}/auth/login`, { phone, password }, { needAuth: false });
  },

  getUserInfo: (role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.get(`${base}/auth/me`);
  },

  // 后端：POST /forgot-password/reset
  resetPassword: (phone, code, newPassword, role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.post(`${base}/auth/forgot-password/reset`, { phone, code, newPassword }, { needAuth: false });
  },

  /** 微信注册/首次登录 → 设置密码 */
  setupPassword: (passwordSetupToken, password) =>
    api.post(`${C}/auth/setup-password`, { passwordSetupToken, password }, { needAuth: false }),

  /** 注册后选择角色（客户/美甲师），可跳过绑定/激活 */
  selectRole: (role, { inviteCode, activationKey } = {}) =>
    api.post(`${C}/auth/select-role`, { role, inviteCode, activationKey }, { needAuth: true }),

  sendResetCode: (phone, role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.post(`${base}/auth/forgot-password/send-code`, { phone }, { needAuth: false });
  }
};

// ========== 客户端 ==========
const client = {
  // 首页后端支持游客访问；始终匿名请求，避免失效 token 被 optional guard 拒绝后产生 401。
  home: () => api.get(`${C}/home`, null, { needAuth: false, silent: true }),
  featuredWorks: (params, options) => api.get(`${C}/featured-works`, params, options),
  beautyArchive: () => api.get(`${C}/beauty-archive`),

  // 后端：PUT /auth/me 更新资料；PATCH /auth/password 改密
  profile: {
    update: (data) => api.put(`${C}/auth/me`, data),
    changePassword: (oldPassword, newPassword) =>
      api.patch(`${C}/auth/password`, { oldPassword, newPassword }),

    findTechByInviteCode: (code) =>
      api.get(`${C}/auth/find-by-invite-code`, { code }).then(result => {
        if (result && result.valid === true) return result.technician;
        if (result && result.valid === false) return null;
        return result || null;
      }),
    bindTechnician: (techId, inviteCode, note, source) =>
      api.post(`${C}/auth/bind-technician`, { techId, inviteCode, note, source }),
    bindQuickBooking: (techId, inviteCode) => api.post(`${C}/auth/bind-quick-booking`, { techId, inviteCode, confirmed: true }),
    bindSharedWork: (workId, shareToken) => api.post(`${C}/auth/bind-shared-work`, { workId, shareToken, confirmed: true }),
    followedTechnicians: () => api.get(`${C}/auth/followed-technicians`),
    requestBinding: (techId, note) =>
      api.post(`${C}/auth/binding-applications/request`, { techId, note }),
    cancelBindingApplication: (techId) =>
      api.del(`${C}/auth/binding-applications/${techId}`),
    unbindTechnician: (techId) =>
      api.del(`${C}/auth/unbind-technician/${techId}`),
    setDefaultTechnician: (techId) =>
      api.post(`${C}/auth/set-default-technician/${techId}`)
  },

  works: {
    list: (params, options) => api.get(`${C}/works`, params, options),
    detail: (id, options) => api.get(`${C}/works/${id}`, null, options),
    like: (id) => api.post(`${C}/works/${id}/like`),
    favorite: (id) => api.post(`${C}/works/${id}/favorite`),
    comments: (id, params) => api.get(`${C}/works/${id}/comments`, params),
    addComment: (id, data) => api.post(`${C}/works/${id}/comments`, data),
    createShareGrant: (id) => api.post(`${C}/works/${id}/share-grant`, {}),
    recordShare: (id, channel) => api.post(`${C}/works/${id}/share-event`, { channel })
  },

  favorites: { list: () => api.get(`${C}/favorites`) },
  likes: { list: () => api.get(`${C}/likes`) },
  wechatSubscriptions: {
    record: (decisions) => api.post(`${C}/wechat-subscriptions/authorization`, { decisions })
  },

  orders: {
    list: (params) => api.get(`${C}/orders`, params),
    detail: (id) => api.get(`${C}/orders/${id}`),
    create: (data) => api.post(`${C}/orders`, data),
    createFromDesign: (data) => api.post(`${C}/orders/from-design`, data),
    update: (id, data) => api.patch(`${C}/orders/${id}`, data),
    acceptQuote: (id, fundAmount = 0) => api.post(`${C}/orders/${id}/agree`, { fundAmount }),
    rejectQuote: (id, reason) => api.post(`${C}/orders/${id}/reject-quote`, { reason }),
    cancel: (id) => api.patch(`${C}/orders/${id}/status`, { status: 'cancelled' }),
    saveReview: (id, data) => api.patch(`${C}/orders/${id}/review`, data),
    saveClientPhotos: (id, photos) => api.patch(`${C}/orders/${id}/client-photos`, { photos }),
    saveClientRecordNote: (id, note) => api.patch(`${C}/orders/${id}/client-record-note`, { note }),
    blockedSlots: (techId) => api.get(`${C}/orders/blocked-slots/${techId}`)
  },

  tradeOrders: {
    list: () => api.get(`${C}/orders/trade-orders/list`)
  },

  payments: {
    createOrder: (orderId, paymentType, idempotencyKey) =>
      api.post(`${C}/payments/orders/${orderId}`, { paymentType, idempotencyKey }),
    listOrder: (orderId) => api.get(`${C}/payments/orders/${orderId}`)
  },

  addresses: {
    list: () => api.get(`${C}/addresses`),
    // 后端无单条详情路由，改用列表按 id 查找
    detail: (id) => api.get(`${C}/addresses`).then((res) => {
      const arr = res.list || res.data || res || [];
      return arr.find((a) => String(a.id) === String(id)) || null;
    }),
    create: (data) => api.post(`${C}/addresses`, data),
    update: (id, data) => api.patch(`${C}/addresses/${id}`, data),
    delete: (id) => api.del(`${C}/addresses/${id}`),
    setDefault: (id) => api.post(`${C}/addresses/${id}/default`, {})
  },

  designs: {
    list: (params) => api.get(`${C}/designs`, params),
    detail: (id) => api.get(`${C}/designs/${id}`),
    create: (data) => api.post(`${C}/designs`, data),
    update: (id, data) => api.patch(`${C}/designs/${id}`, data),
    delete: (id) => api.del(`${C}/designs/${id}`),
    acceptQuote: (id) => api.post(`${C}/designs/${id}/accept-quote`),
    rejectQuote: (id, reason) => api.post(`${C}/designs/${id}/reject-quote`, { reason }),
    createOrder: (id, data) => api.post(`${C}/designs/${id}/create-order`, data)
  },

  customService: {
    list: (params) => api.get(`${C}/custom-service-requests`, params),
    detail: (id) => api.get(`${C}/custom-service-requests/${id}`),
    create: (data) => api.post(`${C}/custom-service-requests`, data)
  },

  feedback: {
    list: () => api.get(`${C}/feedback`),
    detail: (id) => api.get(`${C}/feedback/${id}`),
    create: (data) => api.post(`${C}/feedback`, data)
  },

  artists: {
    followStatus: (id) => api.get(`${C}/artists/${id}/follow`),
    follow: (id) => api.post(`${C}/artists/${id}/follow`, {}),
    unfollow: (id) => api.del(`${C}/artists/${id}/follow`)
  },

  referrals: {
    list: () => api.get(`${C}/referrals`),
    createLink: (technicianId) => api.post(`${C}/referrals/link`, { technicianId }),
    claim: (token) => api.post(`${C}/referrals/claim`, { token }),
    funds: () => api.get(`${C}/reward-funds`)
  }
};

// ========== 技师端 ==========
const technician = {
  invitationLink: () => api.post(`${T}/invitation/link`, {}),
  artistInteractions: (params) => api.get(`${T}/artist-interactions`, params),
  brandProfile: {
    get: () => api.get(`${T}/brand-profile`),
    update: (data) => api.put(`${T}/brand-profile`, data)
  },
  insights: {
    overview: (params) => api.get(`${T}/insights/overview`, params)
  },
  wechatSubscriptions: {
    record: (decisions) => api.post(`${T}/wechat-subscriptions/authorization`, { decisions })
  },

  auth: {
    login: (phone, password) => auth.login(phone, password, 'technician'),
    getUserInfo: () => auth.getUserInfo('technician'),
    updateProfile: (data) => api.patch(`${T}/auth/profile`, data),
    updateStatus: (status) => api.patch(`${T}/auth/status`, { status }),
    changePassword: (oldPassword, newPassword) =>
      api.patch(`${T}/auth/password`, { oldPassword, newPassword }),
    updateServiceType: (data) => api.patch(`${T}/auth/service-type`, data),
    sendInitialPasswordCode: (phone) => api.post(`${T}/auth/set-initial-password/send-code`, { phone }, { needAuth: false }),
    setInitialPassword: (phone, code, newPassword) => api.post(`${T}/auth/set-initial-password`, { phone, code, newPassword }, { needAuth: false }),
    setPassword: (newPassword) => api.post(`${T}/auth/set-password`, { newPassword }),
    switchToClient: () => api.post(`${T}/auth/switch-to-client`, {}),
    bindingApplications: () => api.get(`${T}/auth/binding-applications`),
    approveBinding: (id) => api.post(`${T}/auth/binding-applications/${id}/approve`, {}),
    rejectBinding: (id, reason) => api.post(`${T}/auth/binding-applications/${id}/reject`, { reason })
  },

  orders: {
    list: (params) => api.get(`${T}/orders`, params),
    trips: () => api.get(`${T}/orders/trips`),
    incomeCalendar: () => api.get(`${T}/orders/income-calendar`),
    detail: (id) => api.get(`${T}/orders/${id}`),
    // 兼容尚未部署 blocked-slots 专用路由的线上后端：从现有订单列表派生美甲师占用。
    blockedSlots: () => api.get(`${T}/orders`).then((result) => {
      const orders = Array.isArray(result) ? result : (result.data || []);
      return orders
        .filter((order) => !['cancelled', 'completed', 'expired'].includes(order.status))
        .map((order) => ({
          orderId: order.id,
          startTime: order.startTime,
          endTime: order.endTime
        }));
    }),
    create: (data) => api.post(`${T}/orders`, data),
    update: (id, data) => api.patch(`${T}/orders/${id}`, data),
    quote: (id, data) => api.patch(`${T}/orders/${id}/review`, data),
    confirm: (id, data) => api.patch(`${T}/orders/${id}/confirm`, data || {}),
    complete: (id, data) => api.patch(`${T}/orders/${id}/complete`, data || {}),
    cancel: (id, data) => api.patch(
      `${T}/orders/${id}/cancel`,
      typeof data === 'string' ? { reason: data } : (data || {})
    ),
    updateActualAmount: (id, actualAmount) => api.patch(`${T}/orders/${id}/actual-amount`, { actualAmount }),
    tradeList: (params) => api.get(`${T}/orders/trade-orders/list`, params)
  },

  customers: {
    list: (params) => api.get(`${T}/customers`, params),
    detail: (id) => api.get(`${T}/customers/${id}`),
    tags: () => api.get(`${T}/customers/tags`),
    todayFollowUps: () => api.get(`${T}/customers/follow-ups/today`),
    createFollowUp: (id, data) => api.post(`${T}/customers/${id}/follow-ups`, data),
    completeFollowUp: (id, followUpId) => api.patch(`${T}/customers/${id}/follow-ups/${followUpId}/complete`, {}),
    updateName: (id, name) => api.patch(`${T}/customers/${id}/name`, { name }),
    archive: (id) => api.patch(`${T}/customers/${id}/archive`, {}),
    updateTags: (id, tags) => api.patch(`${T}/customers/${id}/tags`, { tags })
  },

  works: {
    list: (params) => api.get(`${T}/works`, params),
    detail: (id) => api.get(`${T}/works/${id}`),
    promotion: (id) => api.get(`${T}/works/${id}/promotion`),
    savePromotion: (id, data) => api.put(`${T}/works/${id}/promotion`, data),
    create: (data) => api.post(`${T}/works`, data),
    createFromOrder: (orderId) => api.post(`${T}/works/from-order/${orderId}`, {}),
    update: (id, data) => api.patch(`${T}/works/${id}`, data),
    delete: (id) => api.del(`${T}/works/${id}`),
    toggleVisible: (id) => api.post(`${T}/works/${id}/toggle-visible`),
    togglePinned: (id) => api.post(`${T}/works/${id}/toggle-pinned`),
    heroRecommendations: () => api.get(`${T}/works/hero-recommendations`),
    saveHeroRecommendations: (workIds, expectedWorkIds) => api.put(`${T}/works/hero-recommendations`, { workIds, expectedWorkIds }),
    toggleFeatured: (id) => api.post(`${T}/works/${id}/toggle-featured`),
    like: (id) => api.post(`${T}/works/${id}/like`),
    favorite: (id) => api.post(`${T}/works/${id}/favorite`),
    getComments: (workId) => api.get(`${T}/works/${workId}/comments`),
    addComment: (workId, data) => api.post(`${T}/works/${workId}/comments`, data),
    deleteComment: (workId, commentId) => api.del(`${T}/works/${workId}/comments/${commentId}`),
    pinComment: (workId, commentId) => api.post(`${T}/works/${workId}/comments/${commentId}/pin`),
    hideComment: (workId, commentId) => api.post(`${T}/works/${workId}/comments/${commentId}/hide`),
    accessOptions: () => api.get(`${T}/works/access-options`),
    updateAccess: (id, data) => api.put(`${T}/works/${id}/access`, data)
  },

  services: {
    list: () => api.get(`${T}/services`),
    create: (data) => api.post(`${T}/services`, data),
    update: (id, data) => api.patch(`${T}/services/${id}`, data),
    delete: (id) => api.del(`${T}/services/${id}`),
    toggle: (id) => api.patch(`${T}/services/${id}/toggle`, {})
  },

  designs: {
    list: () => api.get(`${T}/designs`),
    quote: (id, data) => api.post(`${T}/designs/${id}/quote`, data)
  },

  subscription: {
    plans: () => api.get(`${T}/subscriptions/plans`),
    current: () => api.get(`${T}/subscriptions/current`),
    changePreview: (planId) => api.get(`${T}/subscriptions/change-preview/${planId}`),
    changes: () => api.get(`${T}/subscriptions/changes`),
    detail: (id) => api.get(`${T}/subscriptions/${id}`),
    create: (data) => api.post(`${T}/subscriptions`, data)
  },

  marketingMaterials: {
    list: () => api.get(`${T}/marketing-materials`),
    create: (data) => api.post(`${T}/marketing-materials`, data),
    update: (id, data) => api.patch(`${T}/marketing-materials/${id}`, data),
    preview: (id) => api.post(`${T}/marketing-materials/${id}/preview`, {}),
    export: (id, idempotencyKey) => api.post(`${T}/marketing-materials/${id}/export`, { idempotencyKey })
  },

  revenues: {
    exportCsv: (params) => api.get(`${T}/revenues/export`, params, { responseType: 'arraybuffer' }),
    exportFull: (params) => api.get(`${T}/revenues/export/full`, params, { responseType: 'arraybuffer' })
  },

  referralCampaign: {
    get: () => api.get(`${T}/referral-campaign`),
    save: (data) => api.put(`${T}/referral-campaign`, data),
    relations: () => api.get(`${T}/referrals`),
    fundSummary: () => api.get(`${T}/reward-funds/summary`)
  },

  // 以下端点后端暂未实现，返回兜底数据避免页面崩溃
  dashboard: () => Promise.resolve({
    worksCount: 0, customersCount: 0, ordersCount: 0,
    todayOrders: 0, monthlyRevenue: 0, rating: 0, todaySchedule: []
  }),

  schedule: {
    get: () => Promise.resolve([]),
    update: () => Promise.reject({ message: '功能开发中' })
  },

  shops: {
    list: () => api.get(`${T}/auth/me`).then((res) => ({
      list: res.shopAddresses || [],
      data: res.shopAddresses || []
    })),
    create: (data) => api.get(`${T}/auth/me`).then((res) => {
      const shops = res.shopAddresses || [];
      shops.push(data);
      return api.patch(`${T}/auth/service-type`, { shopAddresses: shops });
    }),
    update: (id, data) => api.get(`${T}/auth/me`).then((res) => {
      const shops = res.shopAddresses || [];
      const idx = shops.findIndex((s) => s.id === id);
      if (idx >= 0) shops[idx] = { ...shops[idx], ...data };
      return api.patch(`${T}/auth/service-type`, { shopAddresses: shops });
    }),
    delete: (id) => api.get(`${T}/auth/me`).then((res) => {
      const shops = (res.shopAddresses || []).filter((s) => s.id !== id);
      return api.patch(`${T}/auth/service-type`, { shopAddresses: shops });
    })
  },

  homeService: {
    get: () => api.get(`${T}/auth/me`).then((res) => ({
      enabled: !!res.homeService
    })),
    update: (data) => api.patch(`${T}/auth/service-type`, { homeService: !!data.enabled })
  },

  tagTemplates: {
    list: (type = 'customer') => api.get(`${T}/customers/tag-templates`, { type })
      .then((result) => filterTagTemplates(result, type)),
    create: (data) => api.post(`${T}/customers/tag-templates`, data),
    delete: (id) => api.del(`${T}/customers/tag-templates/${id}`)
  }
};

// ========== 消息（双端共用）==========
const chat = {
  technician: {
    conversations: (opts = {}) => api.get(`${T}/messages/conversations`, null, opts),
    messages: (params, opts = {}) => {
      const query = params && params.conversationId
        ? { conversation_id: params.conversationId }
        : params;
      return api.get(`${T}/messages`, query, opts);
    },
    sendMessage: (data) => {
      const body = { ...data };
      if (body.conversationId != null) {
        body.conversation_id = body.conversationId;
        delete body.conversationId;
      }
      if (body.clientId != null) {
        body.client_id = body.clientId;
        delete body.clientId;
      }
      return api.post(`${T}/messages`, body);
    },
    markRead: (conversationId) => api.patch(`${T}/messages/read`, { conversation_id: conversationId })
  },
  conversations: (role = 'client', opts = {}) => {
    const base = role === 'technician' ? T : C;
    return api.get(`${base}/messages/conversations`, null, opts);
  },
  // 后端 query 用蛇形 conversation_id
  messages: (params, role = 'client', opts = {}) => {
    const base = role === 'technician' ? T : C;
    const query = params && params.conversationId
      ? { conversation_id: params.conversationId }
      : params;
    return api.get(`${base}/messages`, query, opts);
  },
  // body 字段也用蛇形
  sendMessage: (data, role = 'client') => {
    const base = role === 'technician' ? T : C;
    const body = { ...data };
    if (body.conversationId != null) {
      body.conversation_id = body.conversationId;
      delete body.conversationId;
    }
    if (body.techId != null) {
      body.tech_id = body.techId;
      delete body.techId;
    }
    if (body.clientId != null) {
      body.client_id = body.clientId;
      delete body.clientId;
    }
    return api.post(`${base}/messages`, body);
  },
  markRead: (conversationId, role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.patch(`${base}/messages/read`, { conversation_id: conversationId });
  },
  forward: (data, role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.post(`${base}/messages/forward`, data);
  }
};

// ========== 上传 ==========
const upload = {
  image: (filePath, role = 'client') => {
    return new Promise((resolve, reject) => {
      const app = getApp();
      const currentRole = app.globalData.role || wx.getStorageSync('role');
      const roleToken = wx.getStorageSync(`${role}_token`);
      const token = roleToken || (currentRole === role ? app.globalData.token : '');
      const baseUrl = app.globalData.apiBaseUrl || 'https://api.lunails.cn';
      const path = role === 'technician' ? `${T}/uploads/image` : `${C}/uploads/image`;

      if (!token) {
        reject({ code:401, message:role === 'technician' ? '美甲师登录状态已失效，请重新登录' : '登录状态已失效，请重新登录' });
        return;
      }

      wx.uploadFile({
        url: `${baseUrl}${path}`,
        filePath,
        name: 'file',
        header: token ? { 'Authorization': `Bearer ${token}` } : {},
        timeout: 30000,
        success: (res) => {
          try {
            const data = res.data ? JSON.parse(res.data) : {};
            if (res.statusCode >= 200 && res.statusCode < 300 && data.url) {
              resolve(data);
            } else {
              const responseMessage = Array.isArray(data.message) ? data.message[0] : data.message;
              reject({
                ...data,
                code: data.code || res.statusCode,
                message: responseMessage || (res.statusCode === 401
                  ? '登录状态已失效，请重新登录'
                  : (res.statusCode >= 500 ? '上传服务暂时不可用' : '图片上传失败'))
              });
            }
          } catch (e) {
            reject({ message: '上传响应解析失败' });
          }
        },
        fail: (err) => {
          const detail = String(err && err.errMsg || '').toLowerCase();
          const isTimeout = detail.includes('timeout');
          const isDomainBlocked = detail.includes('domain') || detail.includes('url not in domain list');
          reject({
            code: isTimeout ? -2 : -1,
            message: isDomainBlocked
              ? '上传域名未配置，请在小程序后台添加 uploadFile 合法域名'
              : (isTimeout ? '上传超时，请重试' : '网络错误，图片上传失败')
          });
        }
      });
    });
  }
};

const publicApi = {
  capabilities: () => api.get(`${P}/capabilities`, null, { needAuth: false, silent: true }),
  launchConfig: () => api.get(`${P}/launch-config`, null, { needAuth: false, silent: true }),
  conversionEvents: {
    record: (data) => api.post(`${P}/conversion-events`, data, { needAuth: false, silent: true })
  },
  artists: {
    detail: (id) => api.get(`${P}/artist/id/${id}`, null, { needAuth: false }),
    shopGuidance: async (id, params) => {
      const result = await api.get(`${P}/artist/id/${id}`, null, { needAuth: false, silent: true });
      const guidance = guidanceFromPublicArtist(result, params);
      if (!guidance) throw { statusCode: 404, code: 404, message: '到店指引不存在或未公开' };
      return guidance;
    },
    card: (code) => api.get(`${P}/artist/${code}`, null, { needAuth: false })
  },
  brands: {
    profile: (id, params) => api.get(`${P}/brands/${id}`, params, { needAuth: false }),
    services: (id, params) => api.get(`${P}/brands/${id}/services`, params, { needAuth: false }),
    works: (id, params) => api.get(`${P}/brands/${id}/works`, params, { needAuth: false }),
    reviews: (id, params) => api.get(`${P}/brands/${id}/reviews`, params, { needAuth: false }),
    availability: (id, params) => api.get(`${P}/brands/${id}/availability`, params, { needAuth: false })
  },
  referrals: {
    resolve: (token) => api.get(`${P}/referrals/${token}`, null, { needAuth: false })
  },
  works: {
    list: (params) => api.get(`${P}/works`, params, { needAuth: false }),
    featured: () => api.get(`${P}/works/featured`, null, { needAuth: false }),
    detail: (id) => api.get(`${P}/works/${id}`, null, { needAuth: false }),
    shared: (token) => api.get(`${P}/works/shared/${token}`, null, { needAuth: false }),
    shareCode: (id, shareToken) => api.get(`${P}/works/${id}/share-code`, shareToken ? { shareToken } : null, { needAuth: false })
  }
};

// 新前端可以连接旧后端：先协商接口能力，避免请求尚未部署的路由。
let bookingCapabilityPromise = null;
let bookingCapabilityExpires = 0;
async function requireBookingSettings() {
  if (!bookingCapabilityPromise || Date.now() >= bookingCapabilityExpires) {
    bookingCapabilityExpires = Date.now() + 60000;
    bookingCapabilityPromise = api.get(`${P}/capabilities`, null, { needAuth: false, silent: true }).catch(err => {
      bookingCapabilityPromise = null;
      throw err;
    });
  }
  const capabilities = await bookingCapabilityPromise;
  if (!capabilities.bookingSettings || capabilities.bookingSettings.available !== true) {
    throw { code: 404, bookingSettingsUnsupported: true, message: '一键预约尚未上线，请稍后再试' };
  }
}
publicApi.bookingSettings = async (id) => {
  await requireBookingSettings();
  return api.get(`${P}/booking-settings/${id}`, null, { needAuth: false, silent: true });
};
technician.bookingDays = {
  list: async () => {
    await requireBookingSettings();
    return api.get(`${T}/booking-days`, null, { silent: true });
  },
  update: async (date, data) => {
    await requireBookingSettings();
    return api.patch(`${T}/booking-days/${date}`, data);
  },
  updateSettings: async (data) => {
    await requireBookingSettings();
    return api.patch(`${T}/booking-days/settings`, data);
  }
};
module.exports = { auth, client, technician, chat, upload, public: publicApi };
