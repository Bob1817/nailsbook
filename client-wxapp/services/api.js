// ========== 所有路径以 /api 为全局前缀（后端 setGlobalPrefix('api')）==========
// 客户端：/api/client/...   技师端：/api/technician/...

const api = require('../utils/request');

const C = '/api/client';
const T = '/api/technician';
const P = '/api/public';

// ========== 鉴权 ==========
const auth = {
  checkPhone: (phone, role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.post(`${base}/auth/check-phone`, { phone }, { needAuth: false });
  },

  registerClient: (phone, password, inviteCode) =>
    api.post(`${C}/auth/register-by-invite`, { phone, password, inviteCode }, { needAuth: false }),

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

  sendResetCode: (phone, role = 'client') => {
    const base = role === 'technician' ? T : C;
    return api.post(`${base}/auth/forgot-password/send-code`, { phone }, { needAuth: false });
  }
};

// ========== 客户端 ==========
const client = {
  home: () => api.get(`${C}/home`),
  beautyArchive: () => api.get(`${C}/beauty-archive`),

  // 后端：PUT /auth/me 更新资料；PATCH /auth/password 改密
  profile: {
    update: (data) => api.put(`${C}/auth/me`, data),
    changePassword: (oldPassword, newPassword) =>
      api.patch(`${C}/auth/password`, { oldPassword, newPassword }),

    findTechByInviteCode: (code) =>
      api.get(`${C}/auth/find-by-invite-code`, { inviteCode: code }),
    bindTechnician: (techId, inviteCode, note) =>
      api.post(`${C}/auth/bind-technician`, { techId, inviteCode, note }),
    unbindTechnician: (techId) =>
      api.del(`${C}/auth/unbind-technician/${techId}`),
    setDefaultTechnician: (techId) =>
      api.post(`${C}/auth/set-default-technician/${techId}`)
  },

  works: {
    list: (params) => api.get(`${C}/works`, params),
    detail: (id) => api.get(`${C}/works/${id}`),
    like: (id) => api.post(`${C}/works/${id}/like`),
    favorite: (id) => api.post(`${C}/works/${id}/favorite`),
    comments: (id, params) => api.get(`${C}/works/${id}/comments`, params),
    addComment: (id, data) => api.post(`${C}/works/${id}/comments`, data),
    createShareGrant: (id) => api.post(`${C}/works/${id}/share-grant`, {}),
    recordShare: (id, channel) => api.post(`${C}/works/${id}/share-event`, { channel })
  },

  favorites: { list: () => api.get(`${C}/favorites`) },
  likes: { list: () => api.get(`${C}/likes`) },

  orders: {
    list: (params) => api.get(`${C}/orders`, params),
    detail: (id) => api.get(`${C}/orders/${id}`),
    create: (data) => api.post(`${C}/orders`, data),
    createFromDesign: (data) => api.post(`${C}/orders/from-design`, data),
    update: (id, data) => api.patch(`${C}/orders/${id}`, data),
    acceptQuote: (id) => api.post(`${C}/orders/${id}/agree`),
    rejectQuote: (id, reason) => api.post(`${C}/orders/${id}/reject-quote`, { reason }),
    cancel: (id) => api.patch(`${C}/orders/${id}/status`, { status: 'cancelled' }),
    markDepositPaid: (id) => api.post(`${C}/orders/${id}/mark-deposit-paid`),
    saveReview: (id, data) => api.patch(`${C}/orders/${id}/review`, data),
    saveClientPhotos: (id, photos) => api.patch(`${C}/orders/${id}/client-photos`, { photos }),
    saveClientRecordNote: (id, note) => api.patch(`${C}/orders/${id}/client-record-note`, { note }),
    blockedSlots: (techId) => api.get(`${C}/orders/blocked-slots/${techId}`)
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
    create: (data) => api.post(`${C}/feedback`, data)
  }
};

// ========== 技师端 ==========
const technician = {
  insights: {
    overview: () => api.get(`${T}/insights/overview`)
  },

  auth: {
    login: (phone, password) => auth.login(phone, password, 'technician'),
    getUserInfo: () => auth.getUserInfo('technician'),
    updateProfile: (data) => api.patch(`${T}/auth/profile`, data),
    updateStatus: (status) => api.patch(`${T}/auth/status`, { status }),
    changePassword: (oldPassword, newPassword) =>
      api.patch(`${T}/auth/password`, { oldPassword, newPassword }),
    updateServiceType: (data) => api.patch(`${T}/auth/service-type`, data),
    setInitialPassword: (phone, newPassword) => api.post(`${T}/auth/set-initial-password`, { phone, newPassword }),
    setPassword: (newPassword) => api.post(`${T}/auth/set-password`, { newPassword })
  },

  orders: {
    list: (params) => api.get(`${T}/orders`, params),
    trips: () => api.get(`${T}/orders/trips`),
    detail: (id) => api.get(`${T}/orders/${id}`),
    create: (data) => api.post(`${T}/orders`, data),
    update: (id, data) => api.patch(`${T}/orders/${id}`, data),
    quote: (id, data) => api.patch(`${T}/orders/${id}/review`, data),
    confirm: (id) => api.patch(`${T}/orders/${id}/confirm`, {}),
    complete: (id) => api.patch(`${T}/orders/${id}/complete`, {}),
    cancel: (id, reason) => api.patch(`${T}/orders/${id}/cancel`, { reason })
  },

  customers: {
    list: (params) => api.get(`${T}/customers`, params),
    detail: (id) => api.get(`${T}/customers/${id}`),
    tags: () => api.get(`${T}/customers/tags`),
    updateName: (id, name) => api.patch(`${T}/customers/${id}/name`, { name }),
    updateTags: (id, tags) => api.patch(`${T}/customers/${id}/tags`, { tags })
  },

  works: {
    list: (params) => api.get(`${T}/works`, params),
    detail: (id) => api.get(`${T}/works/${id}`),
    create: (data) => api.post(`${T}/works`, data),
    update: (id, data) => api.patch(`${T}/works/${id}`, data),
    delete: (id) => api.del(`${T}/works/${id}`),
    toggleVisible: (id) => api.post(`${T}/works/${id}/toggle-visible`),
    togglePinned: (id) => api.post(`${T}/works/${id}/toggle-pinned`),
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
    current: () => api.get(`${T}/auth/me`).then((res) => res.subscription || null),
    detail: (id) => api.get(`${T}/subscriptions/${id}`),
    create: (data) => api.post(`${T}/subscriptions`, data)
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
    list: () => api.get(`${T}/customers/tag-templates`),
    create: (data) => api.post(`${T}/customers/tag-templates`, data),
    delete: (id) => api.del(`${T}/customers/tag-templates/${id}`)
  }
};

// ========== 消息（双端共用）==========
const chat = {
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
      const token = app.globalData.token;
      const baseUrl = app.globalData.apiBaseUrl || 'https://api.lunails.cn';
      const path = role === 'technician' ? `${T}/uploads` : `${C}/uploads`;

      wx.uploadFile({
        url: `${baseUrl}${path}`,
        filePath,
        name: 'file',
        header: token ? { 'Authorization': `Bearer ${token}` } : {},
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (res.statusCode >= 200 && res.statusCode < 300 && data.url) {
              resolve(data);
            } else {
              reject({
                ...data,
                code: data.code || res.statusCode,
                message: data.message || (res.statusCode >= 500 ? '上传服务暂时不可用' : '图片上传失败')
              });
            }
          } catch (e) {
            reject({ message: '上传响应解析失败' });
          }
        },
        fail: (err) => {
          const isTimeout = String(err && err.errMsg || '').toLowerCase().includes('timeout');
          reject({ code: isTimeout ? -2 : -1, message: isTimeout ? '上传超时，请重试' : '网络错误，图片上传失败' });
        }
      });
    });
  }
};

const publicApi = {
  works: {
    detail: (id) => api.get(`${P}/works/${id}`, null, { needAuth: false }),
    shared: (token) => api.get(`${P}/works/shared/${token}`, null, { needAuth: false })
  }
};

module.exports = { auth, client, technician, chat, upload, public: publicApi };
