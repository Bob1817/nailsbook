const api = require('../utils/request');

function getBaseUrl(role = 'client') {
  return role === 'technician' ? '/api/technician' : '/api/client';
}

const auth = {
  checkPhone: (phone, role = 'client') => {
    return api.post(`${getBaseUrl(role)}/auth/check-phone`, { phone });
  },

  registerClient: (phone, password, inviteCode) => {
    return api.post(`${getBaseUrl('client')}/auth/register-by-invite`, {
      phone, password, inviteCode
    });
  },

  registerTechnician: (inviteKey, name, phone, password) => {
    return api.post(`${getBaseUrl('technician')}/auth/register`, {
      inviteKey, name, phone, password
    });
  },

  login: (phone, password, role = 'client') => {
    return api.post(`${getBaseUrl(role)}/auth/login`, { phone, password });
  },

  getUserInfo: (role = 'client') => {
    return api.get(`${getBaseUrl(role)}/auth/me`);
  },

  resetPassword: (phone, newPassword, role = 'client') => {
    return api.post(`${getBaseUrl(role)}/auth/reset-password`, { phone, newPassword });
  }
};

const client = {
  home: () => api.get('/home'),

  profile: {
    update: (data) => api.patch('/api/client/auth/profile', data),
    findTechByInviteCode: (code) => api.get(`/api/client/auth/find-technician?inviteCode=${encodeURIComponent(code)}`),
    bindTechnician: (techId, inviteCode) => api.post('/api/client/auth/bind-technician', { techId, inviteCode }),
    unbindTechnician: (techId) => api.del(`/api/client/auth/unbind-technician/${techId}`),
    setDefaultTechnician: (techId) => api.patch(`/api/client/auth/set-default-technician`, { techId })
  },

  works: {
    list: (params) => api.get('/works', params),
    detail: (id) => api.get(`/works/${id}`),
    like: (id) => api.post(`/works/${id}/like`),
    unlike: (id) => api.del(`/works/${id}/like`),
    favorite: (id) => api.post(`/works/${id}/favorite`),
    unfavorite: (id) => api.del(`/works/${id}/favorite`),
    comments: (id, params) => api.get(`/works/${id}/comments`, params),
    addComment: (id, data) => api.post(`/works/${id}/comments`, data)
  },

  favorites: {
    list: () => api.get('/favorites')
  },

  likes: {
    list: () => api.get('/likes')
  },

  orders: {
    list: (params) => api.get('/orders', params),
    detail: (id) => api.get(`/orders/${id}`),
    create: (data) => api.post('/orders', data),
    acceptQuote: (id) => api.post(`/orders/${id}/agree`),
    rejectQuote: (id, reason) => api.post(`/orders/${id}/reject-quote`, { reason }),
    cancel: (id) => api.patch(`/orders/${id}/status`, { status: 'cancelled' }),
    review: (id, data) => api.post(`/orders/${id}/review`, data)
  },

  addresses: {
    list: () => api.get('/addresses'),
    detail: (id) => api.get(`/addresses/${id}`),
    create: (data) => api.post('/addresses', data),
    update: (id, data) => api.patch(`/addresses/${id}`, data),
    delete: (id) => api.del(`/addresses/${id}`),
    setDefault: (id) => api.patch(`/addresses/${id}/set-default`, {})
  },

  designs: {
    list: (params) => api.get('/designs', params),
    detail: (id) => api.get(`/designs/${id}`),
    create: (data) => api.post('/designs', data),
    update: (id, data) => api.patch(`/designs/${id}`, data),
    acceptQuote: (id) => api.post(`/designs/${id}/accept-quote`),
    rejectQuote: (id, reason) => api.post(`/designs/${id}/reject-quote`, { reason }),
    createOrder: (id, data) => api.post(`/designs/${id}/create-order`, data)
  },

  customService: {
    create: (data) => api.post('/custom-service-requests', data),
    list: (params) => api.get('/custom-service-requests', params),
    detail: (id) => api.get(`/custom-service-requests/${id}`)
  }
};

const technician = {
  auth: {
    login: (phone, password) => auth.login(phone, password, 'technician'),
    getUserInfo: () => auth.getUserInfo('technician'),
    updateProfile: (data) => api.patch('/api/technician/auth/profile', data),
    updateStatus: (status) => api.patch('/api/technician/auth/status', { status }),
    changePassword: (oldPassword, newPassword) => api.post('/api/technician/auth/change-password', { oldPassword, newPassword })
  },

  dashboard: () => api.get('/api/technician/dashboard'),

  orders: {
    list: (params) => api.get('/api/technician/orders', params),
    detail: (id) => api.get(`/api/technician/orders/${id}`),
    quote: (id, data) => api.patch(`/api/technician/orders/${id}/quote`, data),
    confirm: (id) => api.patch(`/api/technician/orders/${id}/confirm`, {}),
    complete: (id) => api.patch(`/api/technician/orders/${id}/complete`, {}),
    cancel: (id, reason) => api.patch(`/api/technician/orders/${id}/cancel`, { reason })
  },

  customers: {
    list: (params) => api.get('/api/technician/customers', params),
    detail: (id) => api.get(`/api/technician/customers/${id}`),
    updateTags: (id, tags) => api.patch(`/api/technician/customers/${id}/tags`, { tags })
  },

  works: {
    list: (params) => api.get('/api/technician/works', params),
    detail: (id) => api.get(`/api/technician/works/${id}`),
    create: (data) => api.post('/api/technician/works', data),
    update: (id, data) => api.patch(`/api/technician/works/${id}`, data),
    delete: (id) => api.del(`/api/technician/works/${id}`),
    toggleVisible: (id) => api.post(`/api/technician/works/${id}/toggle-visible`),
    togglePinned: (id) => api.post(`/api/technician/works/${id}/toggle-pinned`),
    toggleFeatured: (id) => api.post(`/api/technician/works/${id}/toggle-featured`)
  },

  services: {
    list: () => api.get('/api/technician/services'),
    create: (data) => api.post('/api/technician/services', data),
    update: (id, data) => api.patch(`/api/technician/services/${id}`, data),
    delete: (id) => api.del(`/api/technician/services/${id}`),
    toggle: (id) => api.post(`/api/technician/services/${id}/toggle`)
  },

  schedule: {
    get: () => api.get('/api/technician/schedule'),
    update: (data) => api.patch('/api/technician/schedule', data)
  },

  shops: {
    list: () => api.get('/api/technician/shops'),
    create: (data) => api.post('/api/technician/shops', data),
    update: (id, data) => api.patch(`/api/technician/shops/${id}`, data),
    delete: (id) => api.del(`/api/technician/shops/${id}`)
  },

  subscription: {
    get: () => api.get('/api/technician/subscription'),
    plans: () => api.get('/api/technician/subscription/plans')
  },

  homeService: {
    get: () => api.get('/api/technician/home-service'),
    update: (data) => api.patch('/api/technician/home-service', data)
  },

  tagTemplates: {
    list: () => api.get('/api/technician/tag-templates'),
    create: (data) => api.post('/api/technician/tag-templates', data),
    delete: (id) => api.del(`/api/technician/tag-templates/${id}`)
  }
};

const chat = {
  conversations: (role = 'client') => api.get(`${getBaseUrl(role)}/conversations`),

  messages: (params, role = 'client') => api.get(`${getBaseUrl(role)}/messages`, params),

  sendMessage: (data, role = 'client') => api.post(`${getBaseUrl(role)}/messages`, data),

  markRead: (conversationId, role = 'client') => api.post(`${getBaseUrl(role)}/messages/read`, { conversationId })
};

const upload = {
  image: (filePath, role = 'client') => {
    return new Promise((resolve, reject) => {
      const token = getApp().globalData.token;
      const baseUrl = getApp().globalData.apiBaseUrl || 'http://localhost:3000';
      const uploadUrl = `${baseUrl}${getBaseUrl(role)}/uploads`;

      wx.uploadFile({
        url: uploadUrl,
        filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.url) {
            resolve(data);
          } else {
            reject(data);
          }
        },
        fail: reject
      });
    });
  }
};

module.exports = {
  auth,
  client,
  technician,
  chat,
  upload
};
